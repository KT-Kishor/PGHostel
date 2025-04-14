sap.ui.define([
    "./BaseController",
    "../utils/validation",
    "sap/m/MessageToast",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/ui/core/BusyIndicator"
], (BaseController, utils, MessageToast, Filter, FilterOperator, BusyIndicator) => {
    "use strict";

    return BaseController.extend("sap.kt.com.minihrsolution.controller.QuotationForm", {
        onInit() {
            this.getOwnerComponent().getRouter().getRoute("RouteQuotationForm").attachMatched(this._onRouteMatched, this);
        },

        _onRouteMatched: function () {
            var oView = this.getView();
            this.oCore = sap.ui.getCore();
            this.oModel = oView.getModel("Quotation");
            this.oLoginModel = oView.getModel("LoginModel");
            this._makeDatePickersReadOnly(["QF_id_VehVariant"]);
            this.i18nModel = this.getView().getModel("i18n").getResourceBundle();

            if (!this.oLoginModel) {
                this.getRouter().navTo("RouteLoginPage");
                return;
            }
            oView.byId("QF_id_PDFBtn").setEnabled(true);
            this._commonGETCall("CompanyCodeDetails", "CompanyCodeDetails", { /*branchCode: this.oModel.getProperty("/QuotationFormData/BranchCode")*/ }, ["QF_id_Page"]);
        },

        QF_onNavBack: function () {
            this.getOwnerComponent().getRouter().navTo("RouteQuotation");
        },

        QF_onBranchCodeChange: function () {
            var sSelectedValue = this.getView().byId("QF_id_BranchCodes").getValue();
            this._commonGETCall("CompanyCodeDetails", "CompanyCodeDetails", { branchCode: sSelectedValue }, ["QF_id_Page"]);
            this.oModel.setProperty("/CompanyCode", sSelectedValue);
            this.oModel.setProperty("/Branch", sSelectedValue.getAdditionalText());
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

        QF_onModelSelectionChange: function (oEvent) {
            var selectedKey = oEvent.getParameter("selectedItem").getKey();
            this._commonGETCall("SchemeUploade", "VariantList", { Model: selectedKey }, ["QF_id_VehVariant"]);
        },

        QF_onVariantChange: function (oEvent) {
            utils._LCvalidateMandatoryField(oEvent);
        },

        QF_onOpenValueHelpDialog: function () {
            if (!this.QF_oDialog) {
                sap.ui.core.Fragment.load({
                    name: "sap.kt.com.minihrsolution.fragment.VehicleVariantList",
                    controller: this,
                }).then(function (oDialog) {
                    this.QF_oDialog = oDialog;
                    this.getView().addDependent(this.QF_oDialog);
                    this.QF_oDialog.open();
                }.bind(this));
            } else {
                this.QF_oDialog.open();
            }
        },

        onSearch: function (oEvent) {
            var sQuery = oEvent.getParameter("newValue");
            if (!sQuery) sQuery = oEvent.getParameter("query");
            var oBinding = this.oCore.byId("VVF_id_Table").getBinding("items");
            var aFilters = [];
            if (sQuery) {
                aFilters = [
                    new Filter("Variant", FilterOperator.Contains, sQuery),
                    new Filter("Transmission", FilterOperator.Contains, sQuery),
                    new Filter("Fuel", FilterOperator.Contains, sQuery),
                    new Filter("Color", FilterOperator.Contains, sQuery),
                    new Filter("BoardPlate", FilterOperator.Contains, sQuery),
                ];
                var oCombinedFilter = new Filter({
                    filters: aFilters,
                    and: false,
                });
                oBinding.filter(oCombinedFilter);
            } else {
                oBinding.filter([]);
            }
        },

        VVF_onVariantSelect: function (oEvent) {
            var oContext = oEvent.getSource().getBindingContext("QData").getObject();
            var oOldData = this.oModel.getProperty("/QuotationFormData");
            var oNewData = Object.assign({}, oOldData, oContext);
            this.oModel.setProperty("/QuotationFormData", oNewData);
            this.getView().byId("QF_id_VehVariant").setValueState("None");
            this._calculateOnRoad();
            this._onCloseDialog();
        },

        _onCloseDialog: function () {
            this.oCore.byId("VVF_id_SearchField").setValue("");
            var oBinding = this.oCore.byId("VVF_id_Table").getBinding("items");
            if (oBinding) oBinding.filter([]);
            this.QF_oDialog.close();
        },

        QF_onPriceChange: function (oEvent) {
            var oSource = oEvent.getSource();
            var sValue = oSource.getValue().trim();
            var rawValue = sValue.replace(/,/g, "");
            if (!/^\d*\.?\d*$/.test(rawValue)) {
                rawValue = 0;
            } else {
                rawValue = parseFloat(rawValue);
            }
            if (isNaN(rawValue)) {
                rawValue = 0;
            }
            var formattedValue = rawValue.toFixed(2);
            var sBindingPath = oSource.getBinding("value").getPath();
            this.oModel.setProperty(sBindingPath, formattedValue);
            this._calculateOnRoad();
        },

        _calculateOnRoad: function () {
            var exShowroomAfterScheme =
                (parseFloat(this.oModel.getProperty("/ExShowroom")) || 0) -
                (parseFloat(this.oModel.getProperty("/ConsumerScheme")) || 0);
            this.oModel.setProperty("/ExShowroomAfterScheme", exShowroomAfterScheme);

            var totalOnRoad =
                (parseFloat(this.oModel.getProperty("/ExShowroomAfterScheme")) || 0) +
                (parseFloat(this.oModel.getProperty("/TCS1Perc")) || 0) +
                (parseFloat(this.oModel.getProperty("/ROADTAX")) || 0) +
                (parseFloat(this.oModel.getProperty("/AddOnInsurance")) || 0) +
                (parseFloat(this.oModel.getProperty("/RegHypCharge")) || 0) +
                (parseFloat(this.oModel.getProperty("/ShieldOfTrust4YR45K")) || 0) +
                (parseFloat(this.oModel.getProperty("/EXTDWarrantyFOR4YR80K")) || 0) +
                (parseFloat(this.oModel.getProperty("/STDFittings")) || 0) +
                (parseFloat(this.oModel.getProperty("/FastTag")) || 0) +
                (parseFloat(this.oModel.getProperty("/VAS")) || 0) +
                (parseFloat(this.oModel.getProperty("/RSA")) || 0) -
                (parseFloat(this.oModel.getProperty("/DiscountOffers")) || 0);
            this.oModel.setProperty("/TotalOnRoad", totalOnRoad);
            this.oModel.refresh(true);
        },

        QF_onPressSubmit: async function () {
            try {
                if (this._checkValidation()) {
                    var response = await this.ajaxCreateWithJQuery("Quotations", {
                        data: JSON.stringify(this.oModel.getProperty("/QuotationFormData")),
                    });
                    if (response.success) {
                        this.oModel.setProperty("/QuotationNumber", response.data.QuotationNumber);
                        this._submitSuccess();
                    } else {
                        MessageToast.show(that.i18nModel.getText("msgSchemeDetailErrorSave"));
                    }
                }
                else {
                    MessageToast.show("Make sure all the mandatory fields are filled and validate the entered value");
                }
            } catch (error) {
                MessageToast.show("Technical error occurred");
            }
        },

        _submitSuccess: function () {
            BusyIndicator.show(0);
            var pdfText = this.i18nModel.getText("btnGeneratePDF");
            var that = this;
            if (!this.QF_oSuccessDialog) {
                this.QF_oSuccessDialog = new sap.m.Dialog({
                    title: "Success",
                    type: sap.m.DialogType.Message,
                    state: "Success",
                    content: new sap.m.Text({
                        text: "Quotation created successfully.",
                    }),
                    buttons: [
                        new sap.m.Button({
                            text: "OK",
                            type: "Accept",
                            press: function () {
                                that.QF_oSuccessDialog.close();
                                that.QF_onNavBack();
                            },
                        }),
                        new sap.m.Button({
                            text: pdfText,
                            type: "Reject",
                            icon: "sap-icon://pdf-attachment",
                            press: function () {
                                that.QF_oSuccessDialog.close();
                                that.onDownloadPDF();
                                that.QF_onNavBack();
                            },
                        }),
                    ],
                });
                this.getView().addDependent(this.QF_oSuccessDialog);
            }
            this.QF_oSuccessDialog.open();
        },

        onPressEdit: async function () {
            var sRole = this.oLoginModel.getProperty("/Role");
            var edits = this.oModel.getProperty("/isEditable");
            var masteredits = this.oModel.getProperty("/MasterEdit");
            if (sRole === "Admin" || sRole === "CEO") {
                this.oModel.setProperty("/isEditable", !edits);
                this.oModel.setProperty("/MasterEdit", !masteredits);
            } else {
                this.oModel.setProperty("/MasterEdit", !masteredits);
            }
            if (masteredits === true) {
                if (this._checkValidation()) {
                    var data = {
                        "data": this.oModel.getProperty("/QuotationFormData"),
                        "filters": {
                            "ID": this.oModel.getProperty("/QuotationNumber")
                        }
                    };
                    var response = await this.ajaxUpdateWithJQuery("Quotations", {
                        data: JSON.stringify(data),
                    });
                    if (!response.success) {
                        MessageToast.show(that.i18nModel.getText("msgSchemeDetailErrorSave"));
                    }
                    this.getView().byId("QF_id_PDFBtn").setEnabled(true);
                    this.oModel.setProperty("/VisibleStatus", false);
                } else {
                    this.QF_onVariantChange();
                    MessageToast.show(this.i18nModel.getText("msgSchemeDetailsMandatory"));
                    this.oModel.setProperty("/MasterEdit", masteredits);
                    this.oModel.setProperty("/isEditable", edits);
                }
            } else {
                this.getView().byId("QF_id_PDFBtn").setEnabled(false);
                this.oModel.setProperty("/VisibleStatus", true);
                this._commonGETCall("SchemeUploade", "VariantList", { Model: this.oModel.getProperty("/QuotationFormData/Model") }, ["QF_id_VehVariant"]);
            }
        },

        _checkValidation: function () {
            return (utils._LCvalidateName(oView.byId("QF_id_CustomerName"), "ID") &&
            utils._LCvalidateMobileNumber(oView.byId("QF_id_CustMobile"), "ID") &&
            utils._LCvalidateEmail(oView.byId("QF_id_CustEmail"), "ID") &&
            utils._LCvalidateAadharCard(oView.byId("QF_id_CustAadhar"), "ID") &&
            utils._LCvalidatePanCard(oView.byId("QF_id_CustPanNumber"), "ID") &&
            utils._LCvalidatePinCode(oView.byId("QF_id_CustPinCode"), "ID") &&
            utils._LCvalidateGstNumber(oView.byId("QF_id_CustGSTNo"), "ID") &&
            utils._LCvalidateMandatoryField(oView.byId("QF_id_CustAddress"), "ID") &&
            utils._LCvalidateMandatoryField(oView.byId("QF_id_VehModel"), "ID") &&
            utils._LCvalidateMandatoryField(oView.byId("QF_id_VehVariant"), "ID"))
        }

    });
});