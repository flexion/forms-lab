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
| Field Recall | 26.0% |
| Field Precision | 65.3% |
| Type Accuracy | 93.6% |
| Group Accuracy | 57.4% |
| Sensitivity Accuracy | 38.3% |

## pardon-application

- Missed: firstName, middleName, lastName, convictionFirstName, convictionMiddleName, convictionLastName, otherNationality, cityState, zipCode, childFullName, childDateOfBirth, childOtherParentNames, childCustody, formerSpouseName, formerSpousePhone, formerMarriageDate, formerDivorceDate, formerMarriagePlace, formerDivorcePlace, familyAdditionalPages, reasonsAdditionalPages, communityActivityDescription, communityActivityDates, communityActivityContactNames, communityActivityContactInfo, communityActivityReasons, communityAdditionalPages, schoolProgramName, subjectStudiedDegree, educationDatesAttended, licenseType, licenseDateIssued, educationDenialProgramName, educationDenialDetails, educationDenialDate, educationAdditionalPages, previousStreetAddress, previousApartmentUnit, previousCityState, previousZipCode, previousDatesLiving, homelessnessDates, militaryNotApplicable, militaryAdditionalPages, currentEmployerType, currentJobStartDate, currentEmployerStreetAddress, currentEmployerCityState, currentEmployerZipCode, currentSupervisorNamePhone, previousEmployerName, previousEmployerType, previousPosition, previousEmployerAddressPhone, previousEmployerDates, unemploymentDetails, jobAdditionalPages, substanceUseNotApplicable, substanceType, substanceFrequency, substanceUseDates, substanceUseDiagnosis, substanceUseDiagnosisDate, treatmentFacilityName, treatmentDates, treatmentStreetAddress, treatmentSuiteNo, treatmentCityState, treatmentZipCode, treatmentPhoneNumber, treatmentEmailAddress, sobrietyAdditionalInfo, sobrietyAdditionalPages, debtDescription, debtAmount, bankruptcyCourt, bankruptcyYearOutcome, bankruptcyDischargeAmount, financialAdditionalInfo, financialAdditionalPages, attachingCaseDocuments, courtOfProsecution, prisonSentence, prisonReleaseDate, probationSupervisedReleaseSentence, probationCompletionDate, assessmentAmount, fineAmount, restitutionAmount, offenseConductAdditionalPages, otherCriminalHistoryAdditionalPages, oathDay, oathMonth, oathYear, releaseOtherNames, releaseStreetAddress, releaseCity, releaseState, releaseZipCode, releasePhoneNumber, releaseSsn, support1PrimaryReference, support1PetitionerName, support1YearsKnown, support1Statement, support1AdditionalPages, support1Signature, support1PrintName, support1Date, support1Address, support1Phone, support1Email, support2PrimaryReference, support2PetitionerName, support2YearsKnown, support2Statement, support2AdditionalPages, support2Signature, support2PrintName, support2Date, support2Address, support2Phone, support2Email, support3PrimaryReference, support3PetitionerName, support3YearsKnown, support3Statement, support3AdditionalPages, support3Signature, support3PrintName, support3Date, support3Address, support3Phone, support3Email
- Extra: fullName, legalNameAtConviction, cityStateZip, childrenDependents, formerSpouseInfo, communityInvolvement, activityContacts, educationPrograms, educationDenials, residentialHistory, homelessnessPeriods, militaryServiceStatus, employmentStartDate, previousEmployment, unemploymentPeriods, substanceUseHistory, substanceUseDetails, substanceDisorderDiagnosis, treatmentHistory, debtInformation, bankruptcyHistory, prosecutionCourt, sentenceReceived, certificationDate, supportLetters
