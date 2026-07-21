import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database, Json } from './database.types'

type DocumentFileRow = Database['public']['Tables']['document_files']['Row']

type DocumentUploadInput = {
  tenantId: string
  bucketId: 'patient-documents' | 'clinical-attachments' | 'practice-assets' | 'generated-documents'
  documentCategory: string
  file: File
  patientId?: string | null
  practiceProfileId?: string | null
  practiceBrandingId?: string | null
  clinicalNoteId?: string | null
  paymentId?: string | null
  invoiceId?: string | null
  sharingScope?: string
  metadata?: Json
}

export function formatFileSize(bytes: number | null | undefined) {
  if (!bytes || bytes <= 0) return 'Size not set'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export async function uploadDocumentFile(
  client: SupabaseClient<Database>,
  input: DocumentUploadInput,
): Promise<DocumentFileRow> {
  const intentResult = await client.rpc('create_document_upload_intent', {
    target_tenant_id: input.tenantId,
    target_bucket_id: input.bucketId,
    target_patient_id: input.patientId ?? null,
    target_document_category: input.documentCategory,
    original_filename_input: input.file.name,
    content_type_input: input.file.type || 'application/octet-stream',
    file_size_bytes_input: input.file.size,
    sharing_scope_input: input.sharingScope ?? 'internal',
    target_practice_profile_id: input.practiceProfileId ?? null,
    target_practice_branding_id: input.practiceBrandingId ?? null,
    target_clinical_note_id: input.clinicalNoteId ?? null,
    target_payment_id: input.paymentId ?? null,
    target_invoice_id: input.invoiceId ?? null,
    metadata_input: input.metadata ?? {},
  } as Database['public']['Functions']['create_document_upload_intent']['Args'])

  if (intentResult.error) throw intentResult.error

  const uploadIntent = intentResult.data?.[0]
  if (!uploadIntent) throw new Error('Document upload intent was not created.')

  const uploadResult = await client.storage
    .from(uploadIntent.bucket_id)
    .upload(uploadIntent.object_path, input.file, {
      contentType: input.file.type || undefined,
      upsert: false,
    })

  if (uploadResult.error) {
    await client.rpc('archive_document_file', {
      target_document_file_id: uploadIntent.document_file_id,
      archive_reason_input: 'Storage upload failed before finalisation.',
    })
    throw uploadResult.error
  }

  const finaliseResult = await client.rpc('finalise_document_upload', {
    target_document_file_id: uploadIntent.document_file_id,
  })

  if (finaliseResult.error) throw finaliseResult.error
  if (!finaliseResult.data) throw new Error('Document upload could not be finalised.')

  return finaliseResult.data as DocumentFileRow
}

export async function createSignedDocumentUrl(
  client: SupabaseClient<Database>,
  bucketId: string,
  objectPath: string,
  expiresInSeconds = 300,
) {
  const result = await client.storage.from(bucketId).createSignedUrl(objectPath, expiresInSeconds)
  if (result.error) throw result.error
  return result.data.signedUrl
}
