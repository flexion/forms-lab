---
kind: pdf-field-extraction
implementation: sonnet
status: current
course-topics: [evaluation, model-selection]
---

# PDF Field Extraction: Claude Sonnet 4

**Status:** production

## Summary

| Metric | Value |
|---|---|
| Field Recall | 62.1% |
| Field Precision | 78.9% |
| Type Accuracy | 97.0% |
| Group Accuracy | 31.4% |
| Sensitivity Accuracy | 27.3% |

## pardon-application

- Missed: convictionFirstName, convictionMiddleName, convictionLastName, otherNationality, parent2FullName, childDateOfBirth, familyAdditionalPages, reasonsAdditionalPages, communityActivityContactInfo, communityAdditionalPages, educationDenialProgramName, educationDenialDetails, educationAdditionalPages, militaryNotApplicable, militaryAdditionalPages, currentEmployerType, currentJobStartDate, currentEmployerCityState, currentEmployerZipCode, currentSupervisorNamePhone, previousEmployerType, previousEmployerAddressPhone, jobAdditionalPages, substanceUseNotApplicable, substanceUseDiagnosis, treatmentPhoneNumber, treatmentEmailAddress, sobrietyAdditionalPages, financialAdditionalPages, attachingCaseDocuments, offenseConductAdditionalPages, otherCriminalHistoryAdditionalPages, oathDay, oathMonth, oathYear, releaseCity, releaseState, support1PrimaryReference, support1PetitionerName, support1YearsKnown, support1AdditionalPages, support2PrimaryReference, support2PetitionerName, support2YearsKnown, support2AdditionalPages, support3PrimaryReference, support3PetitionerName, support3YearsKnown, support3AdditionalPages
- Extra: legalNameAtConvictionFirst, legalNameAtConvictionMiddle, legalNameAtConvictionLast, parent2Name, childBirthDate, activityContactInfo, denialProgramName, denialDetails, militaryServiceQuestion, currentBusinessType, currentStartDate, employerCityState, supervisorContact, previousBusinessType, previousEmployerAddress, substanceUseStruggle, substanceDisorderDiagnosis, signatureDateDay, signatureDateMonth, signatureDateYear, authCityStateZip, letter1PetitionerName, letter1YearsKnown, letter2PetitionerName, letter2YearsKnown, letter3PetitionerName, letter3YearsKnown, letter3Phone, letter3Email

## i-9

- Missed: lawfulPermanentResidentUscisNumber, alienWorkAuthorizationExpiration, alienUscisANumber, alienForeignPassportCountry, listADocumentTitle1, listAIssuingAuthority1, listADocumentNumber1, listAExpirationDate1, listADocumentTitle2, listAIssuingAuthority2, listADocumentNumber2, listAExpirationDate2, listADocumentTitle3, listAIssuingAuthority3, listADocumentNumber3, listAExpirationDate3, listBDocumentTitle, listBIssuingAuthority, listBDocumentNumber, listBExpirationDate, listCDocumentTitle, listCIssuingAuthority, listCDocumentNumber, listCExpirationDate, alternativeProcedureCheckbox, supplementAEmployeeLastName, supplementAEmployeeFirstName, supplementAEmployeeMiddleInitial, preparer1Signature, preparer1Date, preparer1LastName, preparer1FirstName, preparer1MiddleInitial, preparer1Address, preparer1City, preparer1State, preparer1ZipCode, preparer2Signature, preparer2Date, preparer2LastName, preparer2FirstName, preparer2MiddleInitial, preparer2Address, preparer2City, preparer2State, preparer2ZipCode, preparer3Signature, preparer3Date, preparer3LastName, preparer3FirstName, preparer3MiddleInitial, preparer3Address, preparer3City, preparer3State, preparer3ZipCode, preparer4Signature, preparer4Date, preparer4LastName, preparer4FirstName, preparer4MiddleInitial, preparer4Address, preparer4City, preparer4State, preparer4ZipCode, suppBEmployeeLastName, suppBEmployeeFirstName, suppBEmployeeMiddleInitial, suppB1RehireDate, suppB1NewLastName, suppB1NewFirstName, suppB1NewMiddleInitial, suppB1DocumentTitle, suppB1DocumentNumber, suppB1ExpirationDate, suppB1EmployerName, suppB1EmployerSignature, suppB1TodayDate, suppB1AdditionalInfo, suppB1AlternativeProcedure, suppB2RehireDate, suppB2NewLastName, suppB2NewFirstName, suppB2NewMiddleInitial, suppB2DocumentTitle, suppB2DocumentNumber, suppB2ExpirationDate, suppB2EmployerName, suppB2EmployerSignature, suppB2TodayDate, suppB2AdditionalInfo, suppB2AlternativeProcedure, suppB3RehireDate, suppB3NewLastName, suppB3NewFirstName, suppB3NewMiddleInitial, suppB3DocumentTitle, suppB3DocumentNumber, suppB3ExpirationDate, suppB3EmployerName, suppB3EmployerSignature, suppB3TodayDate, suppB3AdditionalInfo, suppB3AlternativeProcedure
- Extra: alienNumber, countryOfIssuance, expirationDate, documentTitle1, issuingAuthority1, documentNumber1, documentExpiration1, documentTitle2, issuingAuthority2, documentNumber2, documentExpiration2, documentTitle3, issuingAuthority3, documentNumber3, documentExpiration3, alternativeProcedure

## w-9

- Missed: otherClassification
- Extra: certificationStatements
