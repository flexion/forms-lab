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
| Field Recall | 61.3% |
| Field Precision | 74.5% |
| Type Accuracy | 92.8% |
| Group Accuracy | 67.6% |
| Sensitivity Accuracy | 32.4% |

## pardon-application

- Missed: convictionFirstName, convictionMiddleName, convictionLastName, otherNationality, parent1FullName, parent2FullName, previousApplicationDate, previousDecisionDate, childCustody, familyAdditionalPages, reasonsAdditionalPages, communityActivityContactNames, communityAdditionalPages, educationDatesAttended, educationDenialProgramName, educationAdditionalPages, previousApartmentUnit, previousCityState, previousDatesLiving, militaryNotApplicable, militaryAdditionalPages, currentEmployerType, currentPosition, currentJobStartDate, currentSupervisorNamePhone, previousEmployerType, previousPosition, jobAdditionalPages, substanceUseNotApplicable, substanceUseDates, substanceUseDiagnosis, substanceUseDiagnosisDate, sobrietyLength, sobrietyAdditionalPages, financialAdditionalPages, attachingCaseDocuments, courtOfProsecution, probationSupervisedReleaseSentence, acceptResponsibility, offenseConductAdditionalPages, otherCriminalHistoryAdditionalPages, oathDay, oathMonth, oathYear, releaseFullName, support1PetitionerName, support1YearsKnown, support1AdditionalPages, support2PrimaryReference, support2PetitionerName, support2YearsKnown, support2Statement, support2AdditionalPages, support2Signature, support2PrintName, support2Date, support2Address, support2Phone, support2Email, support3PrimaryReference, support3PetitionerName, support3YearsKnown, support3Statement, support3AdditionalPages, support3Signature, support3PrintName, support3Date, support3Address, support3Phone, support3Email
- Extra: fullName, legalNameAtConviction, citizenshipOther, parent1Name, parent2Name, attorneyPhone, priorApplicationDate, priorDecisionDate, custodyStatus, communityActivityContactName, educationDates, educationDenialProgram, residenceApartmentUnit, residenceDates, militaryServiceApplicable, currentEmployerTypeOfBusiness, currentEmployerPosition, currentEmployerStartDate, currentEmployerSupervisorName, previousEmployerTypeOfBusiness, previousEmployerPosition, substanceUseApplicable, substanceDatesUsed, substanceUseDisorderDiagnosis, substanceUseDisorderDate, sobrietyDuration, documentsAttached, prosecutionCourt, probationSentence, responsibilityAcceptance, certificationOathDay, certificationOathMonth, certificationOathYear, authorizationFullName, authorizationCity, authorizationState, letterPetitionerName, letterSignerKnownYears
