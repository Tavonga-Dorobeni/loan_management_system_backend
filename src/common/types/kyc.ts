export enum KycDocumentTypes {
  NATIONAL_ID = 'national_id',
  PASSPORT = 'passport',
  DRIVERS_LICENSE = 'drivers_license',
  PROOF_OF_RESIDENCE = 'proof_of_residence',
  BANK_STATEMENT = 'bank_statement',
  PAYSLIP = 'payslip',
  EMPLOYMENT_LETTER = 'employment_letter',
  TAX_CERTIFICATE = 'tax_certificate',
}

export const kycDocumentTypeValues = Object.values(KycDocumentTypes);
