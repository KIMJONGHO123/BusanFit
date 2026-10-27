package com.busanfit.diagnosis;

import static com.tngtech.archunit.lang.syntax.ArchRuleDefinition.classes;
import static com.tngtech.archunit.lang.syntax.ArchRuleDefinition.noClasses;

import com.tngtech.archunit.core.importer.ClassFileImporter;
import com.tngtech.archunit.core.importer.ImportOption;
import org.junit.jupiter.api.Test;

class DiagnosisArchitectureTest {
    @Test
    void domainOnlyDependsOnJdkAndItsOwnTypes() {
        var imported = new ClassFileImporter().withImportOption(ImportOption.Predefined.DO_NOT_INCLUDE_TESTS)
                .importPackages("com.busanfit.diagnosis");
        classes().that().resideInAPackage("..diagnosis.domain..")
                .should().onlyDependOnClassesThat().resideInAnyPackage("java..", "..diagnosis.domain..")
                .check(imported);
    }

    @Test
    void applicationAndApiCannotReachExternalAdaptersOrLegacyDiagnosis() {
        var imported = new ClassFileImporter().withImportOption(ImportOption.Predefined.DO_NOT_INCLUDE_TESTS)
                .importPackages("com.busanfit.diagnosis");
        noClasses().that().resideInAnyPackage("..diagnosis.application..", "..diagnosis.api..")
                .should().dependOnClassesThat().resideInAnyPackage("..diagnosis.adapter..", "..global.external..")
                .check(imported);
        noClasses().that().resideInAPackage("..diagnosis.application..")
                .should().dependOnClassesThat().resideInAPackage("..diagnosis.api..")
                .check(imported);
        noClasses().that().resideInAPackage("..diagnosis..")
                .should().dependOnClassesThat().haveSimpleName("PlannerDiagnosisService")
                .check(imported);
    }
}
