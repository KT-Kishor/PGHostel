sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "../utils/validation"
], (Controller, utils) => {
    "use strict";

    return Controller.extend("sap.kt.com.minihrsolution.controller.View1", {
        onInit() {


        },

        validateMobileNo: function (oEvent) {
            utils._LCvalidateMobileNumber(oEvent);
        },
        validateName: function (oEvent) {
            utils._LCvalidateName(oEvent);
        },
        validateEmail: function (oEvent) {
            utils._LCvalidateEmail(oEvent);
        },
        validateAmount: function (oEvent) {
            utils._LCvalidateAmount(oEvent);
        },
        validateVoterId: function (oEvent) {
            utils._LCvalidateVoterId(oEvent);
        },
        validateAadharCard: function (oEvent) {
            utils._LCvalidateAadharCard(oEvent);
        },
        validatePassport: function (oEvent) {
            utils._LCvalidatePassport(oEvent);
        },
        validatePanCard: function (oEvent) {
            utils._LCvalidatePanCard(oEvent);
        },
        validateAccountNo: function (oEvent) {
            utils._LCvalidateAccountNo(oEvent);
        },
        validateIfcCode: function (oEvent) {
            utils._LCvalidateIfcCode(oEvent);
        },
        validateDate: function (oEvent) {
            utils._LCvalidateDate(oEvent);
        },
        validateGstNumber: function (oEvent) {
            utils._LCvalidateGstNumber(oEvent);
        },
        ValidateCommonFields: function (oEvent) {
            utils._LCvalidateMandatoryField(oEvent);
        },

        //Save the Data
        onSubmitData: function (oEvent) {
            try {
                if (utils._LCvalidateMobileNumber(this.byId("idMobileNo"), "ID") && utils._LCvalidateName(this.byId("idName"), "ID") && utils._LCvalidateEmail(this.byId("idEmail"), "ID") && utils._LCvalidateAmount(this.byId("idAmount"), "ID") && utils._LCvalidateVoterId(this.byId("idVoterID"), "ID") && utils._LCvalidateAadharCard(this.byId("idAadharCard"), "ID") && utils._LCvalidatePassport(this.byId("idPassport"), "ID") && utils._LCvalidatePanCard(this.byId("idPanCard"), "ID")
                    && utils._LCvalidateAccountNo(this.byId("idAccountNumber"), "ID") && utils._LCvalidateName(this.byId("idAccountantName"), "ID") && utils._LCvalidateIfcCode(this.byId("idIfscCode"), "ID") && utils._LCvalidateDate(this.byId("idDate"), "ID") && utils._LCvalidateGstNumber(this.byId("idGst"), "ID") && utils._LCvalidateMandatoryField(this.byId("idAddress"), "ID") && utils._LCvalidateMandatoryField(this.byId("idCompanyName"), "ID")
                    && utils._LCvalidateMandatoryField(this.byId("idComments"), "ID") && utils._LCvalidateMandatoryField(this.byId("idSource"), "ID") && utils._LCvalidateMandatoryField(this.byId("idDestination"), "ID") && utils._LCvalidateMandatoryField(this.byId("idCountry"), "ID") && utils._LCvalidateMandatoryField(this.byId("idBankName"), "ID") && utils._LCvalidateMandatoryField(this.byId("idFileUploader"), "ID")) {
                }

                else {
                    sap.m.MessageToast.show("Make sure all the mandatory fields are filled and validate the entered value");
                }
            }
            catch {
                sap.m.MessageToast.show("Technical error please connect to administrator");
            }

        }
    });
});
