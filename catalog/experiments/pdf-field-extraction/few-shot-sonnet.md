---
kind: pdf-field-extraction
implementation: few-shot-sonnet
status: current
course-topics: [evaluation, few-shot, prompt-conditioning]
---

# PDF Field Extraction: Claude Sonnet 4 (few-shot)

**Status:** experimental

## Summary

| Metric | Value |
|---|---|
| Field Recall | 56.6% |
| Field Precision | 93.1% |
| Type Accuracy | 93.2% |
| Group Accuracy | 41.4% |
| Sensitivity Accuracy | 14.7% |

## pardon-application

- Missed: firstName, middleName, lastName, convictionFirstName, convictionMiddleName, convictionLastName, otherNationality, childFullName, childDateOfBirth, childOtherParentNames, childCustody, formerSpouseName, formerSpousePhone, formerMarriageDate, formerDivorceDate, formerMarriagePlace, formerDivorcePlace, familyAdditionalPages, reasonsAdditionalPages, communityActivityDescription, communityActivityDates, communityActivityContactNames, communityActivityContactInfo, communityActivityReasons, communityAdditionalPages, schoolProgramName, subjectStudiedDegree, educationDatesAttended, licenseType, licenseDateIssued, educationDenialProgramName, educationDenialDetails, educationDenialDate, educationAdditionalPages, previousStreetAddress, previousApartmentUnit, previousCityState, previousZipCode, previousDatesLiving, homelessnessDates, militaryNotApplicable, militaryServiceDetails, militaryAdditionalPages, currentEmployer, currentEmployerType, currentPosition, currentJobStartDate, currentEmployerStreetAddress, currentEmployerCityState, currentEmployerZipCode, currentSupervisorNamePhone, previousEmployerName, previousEmployerType, previousPosition, previousEmployerAddressPhone, previousEmployerDates, unemploymentDetails, criminalRecordEmploymentImpact, jobMisconductDetails, jobAdditionalPages, substanceType, substanceFrequency, substanceUseDates, substanceUseDiagnosis, substanceUseDiagnosisDate, treatmentFacilityName, treatmentDates, treatmentStreetAddress, treatmentSuiteNo, treatmentCityState, treatmentZipCode, treatmentPhoneNumber, treatmentEmailAddress, sobrietyAdditionalInfo, sobrietyAdditionalPages, debtDescription, debtAmount, bankruptcyCourt, bankruptcyYearOutcome, bankruptcyDischargeAmount, financialAdditionalInfo, financialAdditionalPages, attachingCaseDocuments, offenseConductAdditionalPages, otherCriminalHistoryAdditionalPages, oathDay, oathMonth, oathYear, releaseCity, releaseState, releaseZipCode, support1PrimaryReference, support1PetitionerName, support1YearsKnown, support1Statement, support1AdditionalPages, support1Signature, support1PrintName, support1Date, support1Address, support1Phone, support1Email, support2PrimaryReference, support2PetitionerName, support2YearsKnown, support2Statement, support2AdditionalPages, support2Signature, support2PrintName, support2Date, support2Address, support2Phone, support2Email, support3PrimaryReference, support3PetitionerName, support3YearsKnown, support3Statement, support3AdditionalPages, support3Signature, support3PrintName, support3Date, support3Address, support3Phone, support3Email
- Extra: fullName, legalNameAtConviction, communityInvolvement, educationalOpportunities, recentAddresses, militaryService, employmentHistory, substanceHistory, debtsDefaults, certificationDate, authorizationCityStateZip, supportLetters

## i-9

- Missed: lawfulPermanentResidentUscisNumber, alienUscisANumber, alienForeignPassportCountry, listBDocumentTitle, listBIssuingAuthority, listBDocumentNumber, listBExpirationDate, listCDocumentTitle, listCIssuingAuthority, listCDocumentNumber, listCExpirationDate, supplementAEmployeeLastName, supplementAEmployeeFirstName, supplementAEmployeeMiddleInitial, preparer2Signature, preparer2Date, preparer2LastName, preparer2FirstName, preparer2MiddleInitial, preparer2Address, preparer2City, preparer2State, preparer2ZipCode, preparer3Signature, preparer3Date, preparer3LastName, preparer3FirstName, preparer3MiddleInitial, preparer3Address, preparer3City, preparer3State, preparer3ZipCode, preparer4Signature, preparer4Date, preparer4LastName, preparer4FirstName, preparer4MiddleInitial, preparer4Address, preparer4City, preparer4State, preparer4ZipCode, suppBEmployeeLastName, suppBEmployeeFirstName, suppBEmployeeMiddleInitial, suppB1NewLastName, suppB1NewFirstName, suppB1NewMiddleInitial, suppB2RehireDate, suppB2NewLastName, suppB2NewFirstName, suppB2NewMiddleInitial, suppB2DocumentTitle, suppB2DocumentNumber, suppB2ExpirationDate, suppB2EmployerName, suppB2EmployerSignature, suppB2TodayDate, suppB2AdditionalInfo, suppB2AlternativeProcedure, suppB3RehireDate, suppB3NewLastName, suppB3NewFirstName, suppB3NewMiddleInitial, suppB3DocumentTitle, suppB3DocumentNumber, suppB3ExpirationDate, suppB3EmployerName, suppB3EmployerSignature, suppB3TodayDate, suppB3AdditionalInfo, suppB3AlternativeProcedure
- Extra: uscisANumber, newName

## w-9

- Missed: otherClassification
- Extra: none
