---
kind: pdf-field-extraction
implementation: haiku
status: current
course-topics: [evaluation, model-selection]
---

# PDF Field Extraction: Claude Haiku 4.5

**Status:** experimental

## Summary

| Metric | Value |
|---|---|
| Field Recall | 57.8% |
| Field Precision | 67.2% |
| Type Accuracy | 95.8% |
| Group Accuracy | 47.1% |
| Sensitivity Accuracy | 50.1% |

## pardon-application

- Missed: convictionFirstName, convictionMiddleName, convictionLastName, otherNationality, familyAdditionalPages, reasonsAdditionalPages, communityActivityContactInfo, communityAdditionalPages, educationAdditionalPages, previousCityState, previousZipCode, militaryNotApplicable, militaryAdditionalPages, currentJobStartDate, jobAdditionalPages, substanceUseNotApplicable, substanceUseDiagnosis, sobrietyAdditionalPages, financialAdditionalPages, attachingCaseDocuments, acceptResponsibility, offenseConductAdditionalPages, otherCriminalHistoryAdditionalPages, oathDay, oathMonth, oathYear, releaseCity, releaseState, releaseZipCode, support1PetitionerName, support1YearsKnown, support1AdditionalPages, support2PrimaryReference, support2PetitionerName, support2YearsKnown, support2Statement, support2AdditionalPages, support2Signature, support2PrintName, support2Date, support2Address, support2Phone, support2Email, support3PrimaryReference, support3PetitionerName, support3YearsKnown, support3Statement, support3AdditionalPages, support3Signature, support3PrintName, support3Date, support3Address, support3Phone, support3Email
- Extra: legalNameAtConvictionFirst, legalNameAtConvictionMiddle, legalNameAtConvictionLast, cityStateZip, communityActivityReferencesContact, militaryServiceStatus, currentEmploymentStartDate, substanceUseHistory, substanceUseDisorderDiagnosis, acceptanceResponsibility, certificationOathDate, authorizationCityStateZip, letterPetitionerName, letterWriterRelationship, letterWriterNonRelated

## i-9

- Missed: lawfulPermanentResidentUscisNumber, alienWorkAuthorizationExpiration, alienUscisANumber, alienForeignPassportNumber, alienForeignPassportCountry, listADocumentTitle1, listAIssuingAuthority1, listADocumentNumber1, listAExpirationDate1, listADocumentTitle2, listAIssuingAuthority2, listADocumentNumber2, listAExpirationDate2, listADocumentTitle3, listAIssuingAuthority3, listADocumentNumber3, listAExpirationDate3, listBDocumentTitle, listBIssuingAuthority, listBDocumentNumber, listBExpirationDate, listCDocumentTitle, listCIssuingAuthority, listCDocumentNumber, listCExpirationDate, preparer1Signature, preparer1Date, preparer1LastName, preparer1FirstName, preparer1MiddleInitial, preparer1Address, preparer1City, preparer1State, preparer1ZipCode, preparer2Signature, preparer2Date, preparer2LastName, preparer2FirstName, preparer2MiddleInitial, preparer2Address, preparer2City, preparer2State, preparer2ZipCode, preparer3Signature, preparer3Date, preparer3LastName, preparer3FirstName, preparer3MiddleInitial, preparer3Address, preparer3City, preparer3State, preparer3ZipCode, preparer4Signature, preparer4Date, preparer4LastName, preparer4FirstName, preparer4MiddleInitial, preparer4Address, preparer4City, preparer4State, preparer4ZipCode, suppBEmployeeLastName, suppBEmployeeFirstName, suppBEmployeeMiddleInitial, suppB1RehireDate, suppB1NewLastName, suppB1NewFirstName, suppB1NewMiddleInitial, suppB1DocumentTitle, suppB1DocumentNumber, suppB1ExpirationDate, suppB1EmployerName, suppB1EmployerSignature, suppB1TodayDate, suppB1AdditionalInfo, suppB1AlternativeProcedure, suppB2RehireDate, suppB2NewLastName, suppB2NewFirstName, suppB2NewMiddleInitial, suppB2DocumentTitle, suppB2DocumentNumber, suppB2ExpirationDate, suppB2EmployerName, suppB2EmployerSignature, suppB2TodayDate, suppB2AdditionalInfo, suppB2AlternativeProcedure, suppB3RehireDate, suppB3NewLastName, suppB3NewFirstName, suppB3NewMiddleInitial, suppB3DocumentTitle, suppB3DocumentNumber, suppB3ExpirationDate, suppB3EmployerName, suppB3EmployerSignature, suppB3TodayDate, suppB3AdditionalInfo, suppB3AlternativeProcedure
- Extra: uscisANumber, foreignPassportNumber, preparerTranslatorLastName, preparerTranslatorFirstName, preparerTranslatorMiddleInitial, preparerTranslatorAddress, preparerTranslatorCityTown, preparerTranslatorState, preparerTranslatorZipCode, preparerTranslatorSignature, preparerTranslatorDate, documentTitle1, document1IssuingAuthority, document1Number, document1ExpirationDate, documentTitle2, document2IssuingAuthority, document2Number, document2ExpirationDate, documentTitle3, document3IssuingAuthority, document3Number, document3ExpirationDate, dateOfRehire, newName, newLastName, newFirstName, newMiddleInitial, reverificationDocumentTitle, reverificationDocumentNumber, reverificationDocumentExpirationDate, reverificationEmployerName, reverificationEmployerSignature, reverificationEmployerDate, reverificationAdditionalInformation, reverificationAlternativeProcedure

## w-9

- Missed: taxClassification, otherClassification, hasForeignPartnersOwnersBeneficiaries
- Extra: entityType, hasForeignPartners, correctTinCertification, backupWithholdingCertification, usPersonCertification, fatcaCertification
