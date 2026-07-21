// ======================================================
// CR8 AUTOS — PHOTO REVIEW REQUEST V2
// Frontend photo review flow + Supabase lead capture + photo storage
// ======================================================

// IMPORTANT:
// 1) index.html must load Supabase before this file:
// <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
// <script src="script.js"></script>
//
// 2) Replace these with your real Supabase project values.
const SUPABASE_URL = 'https://llrjzyhdphitrjzbstoq.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxscmp6eWhkcGhpdHJqemJzdG9xIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY3MTc1NDUsImV4cCI6MjA5MjI5MzU0NX0.3ml84Lp1AqUlwUV8xkgNwmrZ7Bdg1NYtzPq3khcXMHY'
const ESTIMATE_PHOTO_BUCKET = 'estimate-lead-photos'

const cr8Supabase = window.supabase?.createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY
)

function getSupabaseClient() {
  return window.cr8Supabase || cr8Supabase || null
}

// ======================================================
// BASIC SITE BEHAVIOR — safe helpers
// ======================================================

const menuBtn = document.querySelector('.menu-btn')
const navLinks = document.querySelector('.nav-links')

if (menuBtn && navLinks && menuBtn.dataset.cr8Bound !== 'true') {
  menuBtn.dataset.cr8Bound = 'true'
  menuBtn.addEventListener('click', () => {
    navLinks.classList.toggle('open')
  })
}

window.addEventListener('scroll', () => {
  const navbar = document.querySelector('.navbar')
  if (!navbar) return
  navbar.classList.toggle('scrolled', window.scrollY > 50)
})

const fadeEls = document.querySelectorAll('.fade-up')
if ('IntersectionObserver' in window && fadeEls.length) {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) entry.target.classList.add('visible')
      })
    },
    { threshold: 0.12 }
  )

  fadeEls.forEach((el) => observer.observe(el))
} else {
  fadeEls.forEach((el) => el.classList.add('visible'))
}

// ======================================================
// PHOTO ESTIMATE REQUEST ELEMENTS
// ======================================================

const estimateForm = document.getElementById('estimate-form')
const resultsSection = document.getElementById('estimate-results')
const imageInput = document.getElementById('estimate-photos')
const previewContainer = document.getElementById('photo-preview')

const severityText = document.getElementById('severity-result')
const estimateText = document.getElementById('estimate-range-result')
const aiSummary = document.getElementById('ai-summary')
const confidenceText = document.getElementById('confidence-result')
const detectedPartsText = document.getElementById('detected-parts-result')
const damageTypesText = document.getElementById('damage-types-result')

let selectedEstimateFiles = []

// ======================================================
// PHOTO ESTIMATE REQUEST WIZARD — current index.html markup
// ======================================================

function initDamageEstimatorWizard() {
  const form = document.getElementById('damageEstimatorForm')
  if (!form) return

  const nextBtn = document.getElementById('damageNextBtn')
  const prevBtn = document.getElementById('damagePrevBtn')
  const analyzeBtn = document.getElementById('damageAnalyzeBtn')
  const fileInput = document.getElementById('damagePhotos')
  const dropZone = document.getElementById('damageDropZone')
  const previewGrid = document.getElementById('damagePreviewGrid')
  const errorBox = document.getElementById('damageEstimatorError')
  const loading = document.getElementById('damageLoading')
  const results = document.getElementById('damageResults')
  const startOver = document.getElementById('damageStartOver')

  let currentStep = 1
  let damageFiles = []

  function setError(message = '') {
    if (!errorBox) return
    errorBox.textContent = message
    errorBox.classList.toggle('active', Boolean(message))
  }

  function stepFields() {
    return Array.from(
      document.querySelectorAll(
        `.damage-step[data-step="${currentStep}"] input, .damage-step[data-step="${currentStep}"] select, .damage-step[data-step="${currentStep}"] textarea`
      )
    )
  }

  function renderStep() {
    form.dataset.step = String(currentStep)

    document.querySelectorAll('.damage-step').forEach((step) => {
      step.classList.toggle('active', Number(step.dataset.step) === currentStep)
    })

    document.querySelectorAll('.damage-ai-step-pill').forEach((pill) => {
      pill.classList.toggle('active', Number(pill.dataset.pill) <= currentStep)
    })

    if (prevBtn) prevBtn.style.display = currentStep === 1 ? 'none' : 'inline-flex'
    if (nextBtn) nextBtn.style.display = currentStep === 4 ? 'none' : 'inline-flex'
    if (analyzeBtn) analyzeBtn.style.display = currentStep === 4 ? 'inline-flex' : 'none'
  }

  function validateStep() {
    setError()

    for (const field of stepFields()) {
      if (field.required && !String(field.value || '').trim()) {
        field.focus()
        setError('Please complete the required fields before continuing.')
        return false
      }

      if (field.type === 'email' && field.value && !field.checkValidity()) {
        field.focus()
        setError('Please enter a valid email address.')
        return false
      }
    }

    if (currentStep === 4 && damageFiles.length === 0) {
      setError('Please upload at least one clear photo of the vehicle damage.')
      return false
    }

    return true
  }

  function addFiles(fileList) {
    setError()
    const files = Array.from(fileList || [])
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp']
    const valid = files.filter((file) => allowedTypes.includes(file.type))

    if (valid.length !== files.length) {
      setError('Some files were skipped. Please upload only JPG, PNG, or WEBP vehicle damage photos.')
    }

    damageFiles = damageFiles.concat(valid).slice(0, 8)
    if (fileInput) fileInput.value = ''
    renderPreviews()
  }

  function renderPreviews() {
    if (!previewGrid) return
    previewGrid.innerHTML = ''

    damageFiles.forEach((file, index) => {
      const card = document.createElement('div')
      card.className = 'damage-preview'

      const img = document.createElement('img')
      img.alt = `Uploaded vehicle damage photo ${index + 1}`
      img.src = URL.createObjectURL(file)
      img.onload = () => URL.revokeObjectURL(img.src)

      const removeBtn = document.createElement('button')
      removeBtn.type = 'button'
      removeBtn.className = 'damage-remove'
      removeBtn.innerHTML = '<i class="fas fa-times"></i>'
      removeBtn.setAttribute('aria-label', 'Remove photo')
      removeBtn.addEventListener('click', () => {
        damageFiles.splice(index, 1)
        renderPreviews()
      })

      card.appendChild(img)
      card.appendChild(removeBtn)
      previewGrid.appendChild(card)
    })
  }

  function getDamagePayload() {
    return {
      name: getFieldValue(['damageName']),
      phone: getFieldValue(['damagePhone']),
      email: getFieldValue(['damageEmail']),
      zip: getFieldValue(['damageZip']),
      vehicleYear: getFieldValue(['vehicleYear']),
      vehicleMake: getFieldValue(['vehicleMake']),
      vehicleModel: getFieldValue(['vehicleModel']),
      vin: getFieldValue(['vehicleVin']).toUpperCase(),
      insurance_type: getFieldValue(['insuranceType']),
      damage_area: getFieldValue(['damageArea']),
      damage_type: getFieldValue(['damageType']),
      severity: getFieldValue(['damageSeverity']),
      description: getFieldValue(['damageDescription'])
    }
  }

  async function submitDamageWizard(event) {
    event.preventDefault()
    if (!validateStep()) return

    const payload = getDamagePayload()
    const vehicle = formatVehicle(payload.vehicleYear, payload.vehicleMake, payload.vehicleModel)

    if (loading) loading.classList.add('active')
    if (results) results.classList.remove('active')
    form.style.display = 'none'

    const savedLead = await saveDamageWizardLead({
      payload,
      vehicle,
      files: damageFiles
    })

    localStorage.setItem(
      'cr8_last_photo_estimate_request',
      JSON.stringify({
        ...payload,
        vehicle,
        supabase_id: savedLead?.id || null,
        photo_count: damageFiles.length,
        created_at: new Date().toISOString(),
        status: 'submitted_for_review'
      })
    )

    if (loading) loading.classList.remove('active')
    renderDamageWizardResults(damageFiles)
  }

  async function saveDamageWizardLead({ payload, vehicle, files }) {
    const client = getSupabaseClient()

    if (!client) {
      console.warn('Supabase client is not available. Lead saved locally only.')
      alert('Your request could not connect to our system. Please call CR8 Autos at (518) 495-6876.')
      return null
    }

    const leadId = crypto.randomUUID()
    let photoUrls = []

    if (files.length) {
      try {
        photoUrls = await uploadEstimatePhotos(leadId, files)
      } catch (error) {
        console.error('Estimate photo upload failed:', error)
        alert(`Photo upload failed, but we will still save your request: ${error.message}`)
      }
    }

    const leadRow = {
      id: leadId,
      name: payload.name,
      phone: payload.phone,
      email: payload.email || null,
      zip: payload.zip || null,
      vehicle,
      vehicle_year: payload.vehicleYear || null,
      vehicle_make: payload.vehicleMake || null,
      vehicle_model: payload.vehicleModel || null,
      vin: payload.vin || null,
      insurance_type: payload.insurance_type || null,
      damage_area: payload.damage_area || null,
      damage_type: payload.damage_type || null,
      severity: payload.severity || null,
      description: payload.description || null,
      photo_urls: photoUrls,
      ai_result: {
        review_type: 'manual_photo_review',
        message: 'Customer submitted vehicle information and photos. CR8 Autos must review and contact the customer as soon as possible.',
        photo_count: files.length,
        vin: payload.vin || null,
        requested_severity: payload.severity || null
      },
      estimate_range: 'Submitted',
      status: 'new',
      created_source: 'photo_estimate_request'
    }

    const { error } = await client
      .from('estimate_leads')
      .insert([leadRow])

    if (error) {
      console.error('Photo review lead insert failed:', error)
      alert(`Supabase did not accept the photo review request: ${error.message}`)
      return null
    }

    return { id: leadId }
  }

  function renderDamageWizardResults(files) {
    const setText = (id, value) => {
      const el = document.getElementById(id)
      if (el) el.textContent = value
    }

    setText('resultRange', 'Submitted')
    setText('resultConfidence', '')
    setText('resultParts', 'Your form has been submitted successfully.')
    setText('resultDamageTypes', `Your vehicle photo${files.length === 1 ? '' : 's'} and information were received.`)
    setText('resultSeverity', '')
    setText('resultSummary', 'CR8 Autos will review your submission and be in touch with you as soon as possible.')
    setText('resultPricingFactors', '')
    setText('resultInspectionFlags', '')
    setText('resultNextStep', '')
    setText('resultBackendProof', '')

    const resultPhotos = document.getElementById('resultPhotos')
    if (resultPhotos) {
      resultPhotos.innerHTML = ''
      files.forEach((file, index) => {
        const card = document.createElement('div')
        card.className = 'damage-preview'
        const img = document.createElement('img')
        img.alt = `Submitted vehicle damage photo ${index + 1}`
        img.src = URL.createObjectURL(file)
        img.onload = () => URL.revokeObjectURL(img.src)
        card.appendChild(img)
        resultPhotos.appendChild(card)
      })
    }

    cleanPhotoReviewResultUi()

    if (results) {
      results.classList.add('active')
      results.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  nextBtn?.addEventListener('click', () => {
    if (!validateStep()) return
    currentStep = Math.min(4, currentStep + 1)
    renderStep()
  })

  prevBtn?.addEventListener('click', () => {
    setError()
    currentStep = Math.max(1, currentStep - 1)
    renderStep()
  })

  form.addEventListener('submit', submitDamageWizard)
  fileInput?.addEventListener('change', (event) => addFiles(event.target.files))
  startOver?.addEventListener('click', () => {
    currentStep = 1
    damageFiles = []
    form.reset()
    form.style.display = 'block'
    if (loading) loading.classList.remove('active')
    if (results) results.classList.remove('active')
    setError()
    renderPreviews()
    renderStep()
  })

  if (dropZone) {
    ;['dragenter', 'dragover'].forEach((eventName) => {
      dropZone.addEventListener(eventName, (event) => {
        event.preventDefault()
        dropZone.classList.add('dragover')
      })
    })

    ;['dragleave', 'drop'].forEach((eventName) => {
      dropZone.addEventListener(eventName, (event) => {
        event.preventDefault()
        dropZone.classList.remove('dragover')
      })
    })

    dropZone.addEventListener('drop', (event) => addFiles(event.dataTransfer.files))
  }

  renderStep()
}

initDamageEstimatorWizard()

// ======================================================
// IMAGE PREVIEW + REMOVE
// ======================================================

function renderPhotoPreviews() {
  if (!previewContainer) return

  previewContainer.innerHTML = ''

  selectedEstimateFiles.forEach((file, index) => {
    const reader = new FileReader()

    reader.onload = (event) => {
      const item = document.createElement('div')
      item.className = 'estimate-preview-item'

      const img = document.createElement('img')
      img.src = event.target.result
      img.alt = `Damage photo ${index + 1}`
      img.className = 'estimate-preview-image'

      const removeBtn = document.createElement('button')
      removeBtn.type = 'button'
      removeBtn.className = 'estimate-preview-remove'
      removeBtn.innerText = 'Remove'
      removeBtn.addEventListener('click', () => {
        selectedEstimateFiles = selectedEstimateFiles.filter((_, i) => i !== index)
        renderPhotoPreviews()
      })

      item.appendChild(img)
      item.appendChild(removeBtn)
      previewContainer.appendChild(item)
    }

    reader.readAsDataURL(file)
  })
}

if (imageInput) {
  imageInput.addEventListener('change', () => {
    const files = Array.from(imageInput.files || [])
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp']

    const cleanFiles = files.filter((file) => allowedTypes.includes(file.type))

    if (cleanFiles.length !== files.length) {
      alert('Some files were skipped. Please upload only JPG, PNG, or WEBP vehicle damage photos.')
    }

    selectedEstimateFiles = cleanFiles
    renderPhotoPreviews()
  })
}

// ======================================================
// PHOTO REQUEST HELPERS
// ======================================================

function normalizeText(value) {
  return String(value || '').trim().toLowerCase()
}

function formatVehicle(year, make, model, fallbackVehicle) {
  const parts = [year, make, model].map((item) => String(item || '').trim()).filter(Boolean)
  if (parts.length) return parts.join(' ')
  return String(fallbackVehicle || '').trim()
}

function getFieldValue(ids) {
  for (const id of ids) {
    const el = document.getElementById(id)
    if (el) return el.value?.trim() || ''
  }
  return ''
}

function listResultItems(items) {
  const values = Array.isArray(items) ? items : items ? [items] : []
  return values.length ? values.join(' • ') : 'Final estimate requires CR8 Autos review and in-person inspection.'
}

function formatBackendProof(photoCount = 0) {
  return `Manual photo review request • ${photoCount} photo${photoCount === 1 ? '' : 's'} uploaded`
}

// ======================================================
// SUPABASE PHOTO STORAGE
// ======================================================

function safeFileName(fileName) {
  return String(fileName || 'damage-photo')
    .toLowerCase()
    .replace(/[^a-z0-9.]+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 90)
}

async function uploadEstimatePhotos(leadId, files) {
  const client = getSupabaseClient()

  if (!client) throw new Error('Supabase client is not available.')
  if (!files.length) return []

  const uploadedUrls = []

  for (let index = 0; index < files.length; index += 1) {
    const file = files[index]
    const path = `${leadId}/${Date.now()}-${index + 1}-${safeFileName(file.name)}`

    const { error: uploadError } = await client.storage
      .from(ESTIMATE_PHOTO_BUCKET)
      .upload(path, file, {
        cacheControl: '3600',
        upsert: false,
        contentType: file.type
      })

    if (uploadError) throw uploadError

    const { data } = client.storage
      .from(ESTIMATE_PHOTO_BUCKET)
      .getPublicUrl(path)

    if (data?.publicUrl) uploadedUrls.push(data.publicUrl)
  }

  return uploadedUrls
}


function cleanPhotoReviewResultUi() {
  const setText = (selector, value) => {
    const el = document.querySelector(selector)
    if (el) el.textContent = value
  }

  setText('#damageResults .damage-step-title', 'Submission Received')

  const rangeLabel = document.querySelector('#resultRange')?.closest('.damage-result-hero')?.querySelector('.damage-result-label')
  if (rangeLabel) rangeLabel.textContent = 'Status'

  const confidenceBox = document.querySelector('#resultConfidence')?.closest('.damage-confidence')
  if (confidenceBox) confidenceBox.style.display = 'none'

  const resultPartsLabel = document.querySelector('#resultParts')?.closest('.damage-result-box')?.querySelector('.damage-result-label')
  if (resultPartsLabel) resultPartsLabel.textContent = 'Form Submitted'

  const resultDamageLabel = document.querySelector('#resultDamageTypes')?.closest('.damage-result-box')?.querySelector('.damage-result-label')
  if (resultDamageLabel) resultDamageLabel.textContent = 'Pictures Received'

  const resultSeverityBox = document.querySelector('#resultSeverity')?.closest('.damage-result-box')
  if (resultSeverityBox) resultSeverityBox.style.display = 'none'

  const resultSummaryLabel = document.querySelector('#resultSummary')?.closest('.damage-result-box')?.querySelector('.damage-result-label')
  if (resultSummaryLabel) resultSummaryLabel.textContent = 'Next Step'

  ;['resultPricingFactors', 'resultInspectionFlags', 'resultNextStep'].forEach((id) => {
    const box = document.getElementById(id)?.closest('.damage-result-box')
    if (box) box.style.display = 'none'
  })

  const disclaimer = document.querySelector('#damageResults .damage-disclaimer')
  if (disclaimer) disclaimer.style.display = 'none'

  const bookBtn = document.querySelector('#damageResults .damage-result-buttons a[href*="booking"]')
  if (bookBtn) bookBtn.innerHTML = '<i class="fas fa-calendar-check"></i> Book Appointment'

  const backendProof = document.getElementById('resultBackendProof')
  if (backendProof) backendProof.style.display = 'none'
}

// ======================================================
// RESULTS UI
// ======================================================

function renderEstimateResults({ photoCount = 0 } = {}) {
  if (resultsSection) resultsSection.style.display = 'block'
  if (severityText) severityText.innerText = 'Request submitted'
  if (estimateText) estimateText.innerText = 'Submitted'
  if (aiSummary) aiSummary.innerText = 'Your vehicle information and damage photos were submitted successfully. CR8 Autos will review everything and contact you with an estimate.'
  if (confidenceText) confidenceText.innerText = 'Manual review'
  if (detectedPartsText) detectedPartsText.innerText = 'Photos received'
  if (damageTypesText) damageTypesText.innerText = 'Manual inspection required'

  const pricingFactorsText = document.getElementById('pricing-factors-result')
  const inspectionFlagsText = document.getElementById('inspection-flags-result')
  const nextStepText = document.getElementById('next-step-result')
  const backendProofText = document.getElementById('backend-proof-result')

  if (pricingFactorsText) pricingFactorsText.innerText = ''
  if (inspectionFlagsText) inspectionFlagsText.innerText = ''
  if (nextStepText) nextStepText.innerText = 'CR8 Autos will review your submission and be in touch with you as soon as possible.'
  if (backendProofText) backendProofText.innerText = ''

  cleanPhotoReviewResultUi()

  if (resultsSection) {
    resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
}

function setSubmitState(button, isLoading, label = 'Submit Photos') {
  if (!button) return
  button.disabled = isLoading
  button.innerHTML = isLoading
    ? '<span class="spinner"></span> Submitting...'
    : label
}

// ======================================================
// FORM SUBMIT — CREATE LEAD, UPLOAD PHOTOS, UPDATE LEAD
// ======================================================

if (estimateForm) {
  estimateForm.addEventListener('submit', async (event) => {
    event.preventDefault()

    if (!getSupabaseClient()) {
      alert('Supabase is not connected. Check the Supabase CDN, URL, and anon key.')
      return
    }

    const submitBtn = estimateForm.querySelector('button[type="submit"]')
    const originalLabel = submitBtn?.innerHTML || 'Submit Photos'
    setSubmitState(submitBtn, true, originalLabel)

    try {
      const name = getFieldValue(['estimate-name', 'damage-name', 'name'])
      const phone = getFieldValue(['estimate-phone', 'damage-phone', 'phone'])
      const email = getFieldValue(['estimate-email', 'damage-email', 'email'])
      const zip = getFieldValue(['estimate-zip', 'damage-zip', 'zip'])

      const vehicleYear = getFieldValue(['estimate-year', 'vehicle-year'])
      const vehicleMake = getFieldValue(['estimate-make', 'vehicle-make'])
      const vehicleModel = getFieldValue(['estimate-model', 'vehicle-model'])
      const fallbackVehicle = getFieldValue(['estimate-vehicle', 'vehicle'])
      const vehicle = formatVehicle(vehicleYear, vehicleMake, vehicleModel, fallbackVehicle)
      const vin = getFieldValue(['estimate-vin', 'vehicle-vin', 'vehicleVin', 'vin']).toUpperCase()

      const insurance_type = getFieldValue(['estimate-insurance', 'insurance-type'])
      const damage_area = getFieldValue(['estimate-damage-area', 'damage-area'])
      const damage_type = getFieldValue(['estimate-damage-type', 'damage-type'])
      const severityInput = getFieldValue(['estimate-severity', 'damage-severity'])
      const description = getFieldValue(['estimate-description', 'damage-description', 'description'])

      if (!name || !phone) {
        alert('Please enter at least your name and phone number.')
        setSubmitState(submitBtn, false, originalLabel)
        return
      }

      // Create lead first, so photo storage can be organized under lead ID.
      const { data: insertedLead, error: insertError } = await getSupabaseClient()
        .from('estimate_leads')
        .insert([
          {
            name,
            phone,
            email: email || null,
            zip: zip || null,
            vehicle,
            vehicle_year: vehicleYear || null,
            vehicle_make: vehicleMake || null,
            vehicle_model: vehicleModel || null,
            vin: vin || null,
            insurance_type: insurance_type || null,
            damage_area: damage_area || null,
            damage_type: damage_type || null,
            severity: severityInput || null,
            description: description || null,
            photo_urls: [],
            ai_result: {
              review_type: 'manual_photo_review',
              message: 'Customer submitted vehicle information and photos. CR8 Autos must review and contact the customer as soon as possible.',
              photo_count: selectedEstimateFiles.length,
              vin: vin || null
            },
            estimate_range: 'Submitted',
            status: 'new',
            created_source: 'photo_estimate_request'
          }
        ])
        .select('id')
        .single()

      if (insertError) throw insertError

      const photoUrls = await uploadEstimatePhotos(insertedLead.id, selectedEstimateFiles)

      if (photoUrls.length) {
        const { error: updateError } = await getSupabaseClient()
          .from('estimate_leads')
          .update({
            photo_urls: photoUrls,
            ai_result: {
              review_type: 'manual_photo_review',
              message: 'Customer submitted vehicle information and photos. CR8 Autos must review and contact the customer as soon as possible.',
              photo_count: selectedEstimateFiles.length,
              vin: vin || null
            }
          })
          .eq('id', insertedLead.id)

        if (updateError) throw updateError
      }

      renderEstimateResults({ photoCount: selectedEstimateFiles.length })

      alert('Your form has been submitted. Your pictures have been received. CR8 Autos will be in touch with you as soon as possible.')

      estimateForm.reset()
      selectedEstimateFiles = []
      renderPhotoPreviews()
    } catch (error) {
      console.error('Photo review request submission failed:', error)
      alert(error?.message || 'Something went wrong submitting your request.')
    } finally {
      setSubmitState(submitBtn, false, originalLabel)
    }
  })
}
