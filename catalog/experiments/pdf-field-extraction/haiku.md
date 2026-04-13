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
| Field Recall | 74.0% |
| Field Precision | 89.9% |
| Type Accuracy | 91.0% |
| Group Accuracy | 74.6% |
| Sensitivity Accuracy | 27.6% |

## pardon-application

- Missed: convictionFirstName, convictionMiddleName, convictionLastName, cityState, familyAdditionalPages, reasonsAdditionalPages, communityAdditionalPages, educationAdditionalPages, militaryAdditionalPages, jobAdditionalPages, sobrietyAdditionalPages, financialAdditionalPages, offenseConductAdditionalPages, otherCriminalHistoryAdditionalPages, support1PrimaryReference, support1PetitionerName, support1YearsKnown, support1Statement, support1AdditionalPages, support1Signature, support1PrintName, support1Date, support1Address, support1Phone, support1Email, support2PrimaryReference, support2PetitionerName, support2YearsKnown, support2Statement, support2AdditionalPages, support2Signature, support2PrintName, support2Date, support2Address, support2Phone, support2Email, support3PrimaryReference, support3PetitionerName, support3YearsKnown, support3Statement, support3AdditionalPages, support3Signature, support3PrintName, support3Date, support3Address, support3Phone, support3Email
- Extra: fullName, legalNameAtConviction, city, state, attorneyPhone, letterPrimaryReference, letterPetitionerName, letterSignerKnownYears, letterSupportStatement, letterSignerSignature, letterSignerPrintName, letterSignerDate, letterSignerAddress, letterSignerPhoneNumber, letterSignerEmailAddress
