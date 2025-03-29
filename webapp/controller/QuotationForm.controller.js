sap.ui.define([
    "./BaseController",
    "../utils/validation",
    "sap/m/MessageToast",
    "../utils/EmployeeOfferJsPDF",
    "sap/ui/core/BusyIndicator"
], (BaseController, utils, MessageToast, jsPDF, BusyIndicator) => {
    "use strict";

    return BaseController.extend("sap.kt.com.minihrsolution.controller.QuotationForm", {
        onInit() {
            this._fetchCommonData("CompanyCodeDetails", "CompanyCodeDetailsModel", { branchcode: "KLB01" });
            this.getOwnerComponent().getRouter().getRoute("RouteQuotationForm").attachMatched(this._onRouteMatched, this);
        },

        _onRouteMatched: function () {},

        QF_onNavBack: function () {
            this.getOwnerComponent().getRouter().navTo("RouteQuotation");
        },

        QF_onNameChange: function (oEvent) {
            utils._LCvalidateName(oEvent);

        },

        QF_onMobileChange: function (oEvent) {
            utils._LCvalidateMobileNumber(oEvent);

        },

        QF_onEmailChange: function (oEvent) {
            utils._LCvalidateEmail(oEvent);

        },

        QF_onAadharChange: function (oEvent) {
            utils._LCvalidateAadharCard(oEvent);

        },

        QF_onPanChange: function (oEvent) {
            utils._LCvalidatePanCard(oEvent);

        },

        QF_onGSTChange: function (oEvent) {
            utils._LCvalidateGstNumber(oEvent);

        },

        QF_onAddressChange: function (oEvent) {
            utils._LCvalidateMandatoryField(oEvent);

        },

        QF_onPinChange: function (oEvent) {
            utils._LCvalidatePinCode(oEvent);
        },

        QF_onModelSelect: function (oEvent) {
            utils._LCvalidateMandatoryField(oEvent);

        },

        QF_onVariantChange: function (oEvent) {
            utils._LCvalidateMandatoryField(oEvent);

        },

        QF_onPressSubmit: function () {
            var oView = this.getView();
            try {
                if ((utils._LCvalidateName(oView.byId("QF_id_CustomerName"), "ID") &&
                    utils._LCvalidateMobileNumber(oView.byId("QF_id_CustMobile"), "ID") &&
                    utils._LCvalidateEmail(oView.byId("QF_id_CustEmail"), "ID") &&
                    utils._LCvalidateAadharCard(oView.byId("QF_id_CustAadhar"), "ID") &&
                    utils._LCvalidatePanCard(oView.byId("QF_id_CustPanNumber"), "ID") &&
                    utils._LCvalidatePinCode(oView.byId("QF_id_CustPinCode"), "ID") &&
                    utils._LCvalidateGstNumber(oView.byId("QF_id_CustGSTNo"), "ID") &&
                    utils._LCvalidateMandatoryField(oView.byId("QF_id_CustAddress"), "ID") &&
                    utils._LCvalidateMandatoryField(oView.byId("QF_id_VehModel"), "ID") &&
                    utils._LCvalidateMandatoryField(oView.byId("QF_id_VehVariant"), "ID"))) {
                    MessageToast.show("Quotation Submitted Successfully");
                }
                else {
                    MessageToast.show("Make sure all the mandatory fields are filled and validate the entered value");
                }
            } catch (error) {
                MessageToast.show("Technical error occurred");
            }
        }

    });
});