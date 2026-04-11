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
| Field Recall | 75.0% |
| Field Precision | 36.2% |
| Type Accuracy | 92.6% |
| Group Accuracy | 72.2% |
| Sensitivity Accuracy | 31.5% |

## pardon-application

- Missed: cityStateZip, childrenDependents, formerSpouseInfo, communityInvolvement, educationPrograms, educationDenials, residentialHistory, homelessnessPeriods, previousEmployment, unemploymentPeriods, substanceUseDetails, treatmentHistory, debtInformation, bankruptcyHistory, sentenceReceived, acceptResponsibility, certificationDate, supportLetters
- Extra: firstName, middleName, lastName, citizenshipOther, city, state, zipCode, attorneyPhone, childName, childDateOfBirth, otherParentNames, custodyStatus, formerSpouseName, formerSpousePhone, formerMarriageDate, formerDivorceDate, formerMarriagePlace, formerDivorcePlace, communityActivityDescription, communityActivityDates, communityActivityContactInfo, communityActivityExplanation, schoolProgramName, subjectStudiedCertification, educationDates, licenseType, licenseDateIssued, educationDenialProgram, educationDenialDetails, educationDenialDate, residenceStreetAddress, residenceApartmentUnit, residenceCityState, residenceZipCode, residenceDates, homelessnessDates, currentEmployerTypeOfBusiness, currentEmployerStreetAddress, currentEmployerCityState, currentEmployerZipCode, currentEmployerSupervisorName, previousEmployerName, previousEmployerTypeOfBusiness, previousEmployerPosition, previousEmployerAddressPhone, previousEmployerDates, unemploymentHistory, substanceType, substanceFrequency, substanceDatesUsed, substanceUseDisorderDate, treatmentFacilityName, treatmentDates, treatmentStreetAddress, treatmentSuiteNumber, treatmentCityState, treatmentZipCode, treatmentPhoneNumber, treatmentEmailAddress, substanceUseAdditionalInformation, debtDescription, debtAmount, bankruptcyCourt, bankruptcyDateOutcome, bankruptcyDebtAmount, financialExperienceExplanation, documentsAttached, prisonSentence, prisonReleaseDate, probationSentence, probationCompletionDate, assessmentAmount, fineAmount, restitutionAmount, responsibilityAcceptance, certificationOathDay, certificationOathMonth, certificationOathYear, authorizationOtherNames, authorizationStreetAddress, authorizationCity, authorizationState, authorizationZipCode, authorizationPhoneNumber, authorizationSocialSecurityNumber, letterPrimaryReference, letterPetitionerName, letterSignerKnownYears, letterSupportStatement, letterSignerSignature, letterSignerPrintName, letterSignerDate, letterSignerAddress, letterSignerPhoneNumber, letterSignerEmailAddress
