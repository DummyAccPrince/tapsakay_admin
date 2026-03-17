<script setup lang="ts">
import { ArrowLeft, Upload, X, User, FileText, Calendar, Phone, Mail, Image } from 'lucide-vue-next'

definePageMeta({
  middleware: 'auth'
})

const supabase = useSupabaseClient()
const router = useRouter()

const loading = ref(false)
const uploadingImage = ref(false)
const errorMessage = ref('')
const successMessage = ref('')

const formData = ref({
  full_name: '',
  email: '',
  phone_number: '',
  password: '',
  license_number: '',
  license_expiry: ''
})

const licenseImageFile = ref<File | null>(null)
const licenseImagePreview = ref<string | null>(null)

const handleImageSelect = (event: Event) => {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  
  if (file) {
    if (!['image/jpeg', 'image/png', 'image/webp', 'image/jpg'].includes(file.type)) {
      errorMessage.value = 'Please select a valid image file (JPEG, PNG, or WebP)'
      return
    }
    
    if (file.size > 5 * 1024 * 1024) {
      errorMessage.value = 'Image size must be less than 5MB'
      return
    }
    
    licenseImageFile.value = file
    licenseImagePreview.value = URL.createObjectURL(file)
    errorMessage.value = ''
  }
}

const removeImage = () => {
  licenseImageFile.value = null
  if (licenseImagePreview.value) {
    URL.revokeObjectURL(licenseImagePreview.value)
    licenseImagePreview.value = null
  }
}

const uploadLicenseImage = async (driverId: string): Promise<string | null> => {
  if (!licenseImageFile.value) return null
  
  uploadingImage.value = true
  try {
    const fileExt = licenseImageFile.value.name.split('.').pop()
    const fileName = `${driverId}-${Date.now()}.${fileExt}`
    const filePath = `licenses/${fileName}`
    
    const { error: uploadError } = await supabase.storage
      .from('driver-licenses')
      .upload(filePath, licenseImageFile.value, {
        cacheControl: '3600',
        upsert: false
      })
    
    if (uploadError) throw uploadError
    
    const { data: { publicUrl } } = supabase.storage
      .from('driver-licenses')
      .getPublicUrl(filePath)
    
    return publicUrl
  } catch (error) {
    console.error('Error uploading license image:', error)
    throw error
  } finally {
    uploadingImage.value = false
  }
}

const hashPassword = async (password: string): Promise<string> => {
  const encoder = new TextEncoder()
  const data = encoder.encode(password)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

const validateForm = (): boolean => {
  if (!formData.value.full_name.trim()) {
    errorMessage.value = 'Full name is required'
    return false
  }
  if (!formData.value.email.trim()) {
    errorMessage.value = 'Email is required'
    return false
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.value.email)) {
    errorMessage.value = 'Please enter a valid email address'
    return false
  }
  if (!formData.value.password || formData.value.password.length < 6) {
    errorMessage.value = 'Password must be at least 6 characters'
    return false
  }
  if (!formData.value.license_number.trim()) {
    errorMessage.value = 'License number is required'
    return false
  }
  if (!formData.value.license_expiry) {
    errorMessage.value = 'License expiry date is required'
    return false
  }
  if (new Date(formData.value.license_expiry) < new Date()) {
    errorMessage.value = 'License expiry date cannot be in the past'
    return false
  }
  return true
}

const createDriver = async () => {
  errorMessage.value = ''
  successMessage.value = ''
  
  if (!validateForm()) return
  
  loading.value = true
  try {
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('email', formData.value.email)
      .single()
    
    if (existingUser) {
      errorMessage.value = 'A user with this email already exists'
      loading.value = false
      return
    }
    
    const { data: existingLicense } = await supabase
      .from('drivers')
      .select('id')
      .eq('driver_license_number', formData.value.license_number)
      .single()
    
    if (existingLicense) {
      errorMessage.value = 'A driver with this license number already exists'
      loading.value = false
      return
    }
    
    const passwordHash = await hashPassword(formData.value.password)
    
    const { data: newUser, error: userError } = await supabase
      .from('users')
      .insert({
        email: formData.value.email.toLowerCase().trim(),
        password_hash: passwordHash,
        role: 'driver',
        full_name: formData.value.full_name.trim(),
        phone_number: formData.value.phone_number.trim() || null,
        is_active: true
      })
      .select()
      .single()
    
    if (userError) throw userError
    
    let licenseImageUrl: string | null = null
    if (licenseImageFile.value) {
      try {
        licenseImageUrl = await uploadLicenseImage(newUser.id)
      } catch (uploadError) {
        console.error('Failed to upload license image:', uploadError)
      }
    }
    
    const { error: driverError } = await supabase
      .from('drivers')
      .insert({
        id: newUser.id,
        driver_license_number: formData.value.license_number.trim(),
        license_expiry_date: formData.value.license_expiry,
        full_name: formData.value.full_name.trim(),
        license_image_url: licenseImageUrl
      })
    
    if (driverError) {
      await supabase.from('users').delete().eq('id', newUser.id)
      throw driverError
    }
    
    successMessage.value = 'Driver created successfully!'
    
    setTimeout(() => {
      router.push('/drivers')
    }, 1500)
    
  } catch (error: any) {
    console.error('Error creating driver:', error)
    errorMessage.value = error.message || 'Failed to create driver. Please try again.'
  } finally {
    loading.value = false
  }
}

onUnmounted(() => {
  if (licenseImagePreview.value) {
    URL.revokeObjectURL(licenseImagePreview.value)
  }
})
</script>

<template>
  <div class="max-w-2xl mx-auto">
    <!-- Header -->
    <div class="flex items-center gap-4 mb-6">
      <UiButton variant="ghost" size="icon" @click="router.push('/drivers')">
        <ArrowLeft class="h-5 w-5" />
      </UiButton>
      <div>
        <h1 class="text-2xl font-bold text-gray-900">Create New Driver</h1>
        <p class="text-gray-500 mt-1">Add a new driver to the system</p>
      </div>
    </div>

    <!-- Form Card -->
    <UiCard class="p-6">
      <form @submit.prevent="createDriver" class="space-y-6">
        <!-- Error Message -->
        <div v-if="errorMessage" class="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
          {{ errorMessage }}
        </div>

        <!-- Success Message -->
        <div v-if="successMessage" class="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm">
          {{ successMessage }}
        </div>

        <!-- Personal Information Section -->
        <div>
          <h3 class="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
            <User class="h-5 w-5 text-primary" />
            Personal Information
          </h3>
          
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div class="md:col-span-2">
              <label class="block text-sm font-medium text-gray-700 mb-1.5">
                Full Name <span class="text-red-500">*</span>
              </label>
              <UiInput
                v-model="formData.full_name"
                placeholder="Enter full name"
                :disabled="loading"
              />
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1.5">
                <Mail class="h-4 w-4 inline mr-1" />
                Email <span class="text-red-500">*</span>
              </label>
              <UiInput
                v-model="formData.email"
                type="email"
                placeholder="driver@example.com"
                :disabled="loading"
              />
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1.5">
                <Phone class="h-4 w-4 inline mr-1" />
                Phone Number
              </label>
              <UiInput
                v-model="formData.phone_number"
                placeholder="+63 9XX XXX XXXX"
                :disabled="loading"
              />
            </div>

            <div class="md:col-span-2">
              <label class="block text-sm font-medium text-gray-700 mb-1.5">
                Password <span class="text-red-500">*</span>
              </label>
              <UiInput
                v-model="formData.password"
                type="password"
                placeholder="Minimum 6 characters"
                :disabled="loading"
              />
            </div>
          </div>
        </div>

        <!-- License Information Section -->
        <div class="border-t pt-6">
          <h3 class="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
            <FileText class="h-5 w-5 text-primary" />
            License Information
          </h3>
          
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1.5">
                License Number <span class="text-red-500">*</span>
              </label>
              <UiInput
                v-model="formData.license_number"
                placeholder="e.g., N01-12-345678"
                :disabled="loading"
              />
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1.5">
                <Calendar class="h-4 w-4 inline mr-1" />
                License Expiry Date <span class="text-red-500">*</span>
              </label>
              <UiInput
                v-model="formData.license_expiry"
                type="date"
                :disabled="loading"
              />
            </div>
          </div>
        </div>

        <!-- License Image Upload Section -->
        <div class="border-t pt-6">
          <h3 class="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
            <Image class="h-5 w-5 text-primary" />
            Driver's License Image
          </h3>
          
          <div v-if="!licenseImagePreview" class="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-primary transition-colors">
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/jpg"
              class="hidden"
              id="license-image-input"
              @change="handleImageSelect"
              :disabled="loading"
            />
            <label for="license-image-input" class="cursor-pointer">
              <Upload class="h-10 w-10 text-gray-400 mx-auto mb-3" />
              <p class="text-sm text-gray-600 mb-1">
                <span class="text-primary font-medium">Click to upload</span> or drag and drop
              </p>
              <p class="text-xs text-gray-500">JPEG, PNG, or WebP (max 5MB)</p>
            </label>
          </div>

          <div v-else class="relative">
            <img
              :src="licenseImagePreview"
              alt="License preview"
              class="w-full max-h-64 object-contain rounded-lg border"
            />
            <button
              type="button"
              @click="removeImage"
              class="absolute top-2 right-2 bg-red-500 text-white p-1.5 rounded-full hover:bg-red-600 transition-colors"
              :disabled="loading"
            >
              <X class="h-4 w-4" />
            </button>
            <p class="text-sm text-gray-500 mt-2">{{ licenseImageFile?.name }}</p>
          </div>
        </div>

        <!-- Submit Button -->
        <div class="border-t pt-6 flex justify-end gap-3">
          <UiButton
            type="button"
            variant="outline"
            @click="router.push('/drivers')"
            :disabled="loading"
          >
            Cancel
          </UiButton>
          <UiButton
            type="submit"
            :disabled="loading || uploadingImage"
          >
            <span v-if="loading || uploadingImage" class="flex items-center gap-2">
              <svg class="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              {{ uploadingImage ? 'Uploading Image...' : 'Creating Driver...' }}
            </span>
            <span v-else>Create Driver</span>
          </UiButton>
        </div>
      </form>
    </UiCard>
  </div>
</template>
