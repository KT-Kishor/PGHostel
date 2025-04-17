sap.ui.define([
    "./BaseController",
    "../utils/validation",
    "sap/m/MessageToast",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "../model/formatter",
    "sap/ui/core/BusyIndicator"
], (BaseController, utils, MessageToast, Filter, FilterOperator, formatter, BusyIndicator) => {
    "use strict";

    return BaseController.extend("sap.kt.com.minihrsolution.controller.QuotationForm", {
        formatter: formatter,
        onInit() {
            this.getOwnerComponent().getRouter().getRoute("RouteQuotationForm").attachMatched(this._onRouteMatched, this);
        },

        _onRouteMatched: async function () {
            var oView = this.getView();
            this.oCore = sap.ui.getCore();
            this.oModel = oView.getModel("Quotation");
            this.oLoginModel = oView.getModel("LoginModel");
            this._makeDatePickersReadOnly(["QF_id_VehVariant", "QF_id_BranchCodes"]);
            this.i18nModel = this.getView().getModel("i18n").getResourceBundle();
            
            if (!this.oLoginModel) {
                this.getRouter().navTo("RouteLoginPage");
                return;
            }
            var response = await this.ajaxCreateWithJQuery("UniqueScheme", {data: {}});
            if (response.success) {
                this.oModel.setProperty("/ModelList", response.results);
            } else {
                MessageToast.show(this.i18nModel.getText("msgSchemeDetailErrorSave"));
            }
            oView.byId("QF_id_PDFBtn").setEnabled(true);
            BusyIndicator.hide();
            this.QF_onBranchCodeChange();
        },

        QF_onNavBack: function () {
            this.getOwnerComponent().getRouter().navTo("RouteQuotation");
        },

        QF_onBranchCodeChange: function () {
            var sSelectedValue = this.getView().byId("QF_id_BranchCodes").getSelectedItem();
            this._commonGETCall("CompanyCodeDetails", "CompanyCodeData", { branchCode: sSelectedValue.getKey() }, ["QF_id_HeaderContent"]);
            this.oModel.setProperty("/QuotationFormData/CompanyCode", sSelectedValue.getKey());
            this.oModel.setProperty("/QuotationFormData/Branch", sSelectedValue.getAdditionalText());
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

        QF_onModelSelectionChange: async function (oEvent) {
            var selectedKey = oEvent.getParameter("selectedItem").getKey();
            var response = await this.ajaxCreateWithJQuery("UniqueScheme", {filters: {Model: selectedKey}}, ["QF_id_VehVariant"]);
            if (response.success) {
                this.oModel.setProperty("/VariantList", response.results);
            } else {
                MessageToast.show(this.i18nModel.getText("msgSchemeDetailErrorSave"));
            }
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
            var oContext = oEvent.getSource().getBindingContext("Quotation").getObject();
            var oOldData = this.oModel.getProperty("/QuotationFormData");
            var oNewData = Object.assign({}, oOldData, oContext);
            this.oModel.setProperty("/QuotationFormData", oNewData);
            this.getView().byId("QF_id_VehVariant").setValueState("None");
            this._calculateOnRoad();
            this.VVF_onCloseDialog();
        },

        VVF_onCloseDialog: function () {
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
                (parseFloat(this.oModel.getProperty("/QuotationFormData/EXShowroom")) || 0) -
                (parseFloat(this.oModel.getProperty("/QuotationFormData/ConsumerScheme")) || 0);
            this.oModel.setProperty("/QuotationFormData/EXShowroomAfterScheme", exShowroomAfterScheme);

            var totalOnRoad =
                (parseFloat(this.oModel.getProperty("/QuotationFormData/EXShowroomAfterScheme")) || 0) +
                (parseFloat(this.oModel.getProperty("/QuotationFormData/ENVTax1Perc")) || 0) +
                (parseFloat(this.oModel.getProperty("/QuotationFormData/TCS1Perc")) || 0) +
                (parseFloat(this.oModel.getProperty("/QuotationFormData/ROADTAX")) || 0) +
                (parseFloat(this.oModel.getProperty("/QuotationFormData/AddOnInsurance")) || 0) +
                (parseFloat(this.oModel.getProperty("/QuotationFormData/RegHypCharge")) || 0) +
                (parseFloat(this.oModel.getProperty("/QuotationFormData/ShieldOfTrust4YR45K")) || 0) +
                (parseFloat(this.oModel.getProperty("/QuotationFormData/EXTDWarrantyFOR4YR80K")) || 0) +
                (parseFloat(this.oModel.getProperty("/QuotationFormData/STDFittings")) || 0) +
                (parseFloat(this.oModel.getProperty("/QuotationFormData/FastTag")) || 0) +
                (parseFloat(this.oModel.getProperty("/QuotationFormData/VAS")) || 0) +
                (parseFloat(this.oModel.getProperty("/QuotationFormData/RSA")) || 0) -
                (parseFloat(this.oModel.getProperty("/QuotationFormData/DiscountOffers")) || 0);
            this.oModel.setProperty("/QuotationFormData/TotalOnRoad", totalOnRoad);
            this.oModel.refresh(true);
        },

        QF_onPressSubmit: async function () {
            var oData = this.oModel.getProperty("/QuotationFormData/");
            oData.QuotationDate = sap.ui.core.format.DateFormat.getDateInstance({ pattern: "yyyy-MM-dd" }).format(oData.QuotationDate);
            oData.ValidUpto = sap.ui.core.format.DateFormat.getDateInstance({ pattern: "yyyy-MM-dd" }).format(oData.ValidUpto);
            delete oData.ID;
            oData.QuotationNumber = "";
            try {
                if (this._checkValidation()) {
                    var response = await this.ajaxCreateWithJQuery("A_Quotations", {
                        data: JSON.stringify(oData),
                    });
                    if (response.success) {
                        this.oModel.setProperty("/QuotationFormData/QuotationNumber", response.data.QuotationNumber);
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
                            "QuotationNumber": this.oModel.getProperty("/QuotationFormData/QuotationNumber")
                        }
                    };
                    var response = await this.ajaxUpdateWithJQuery("A_Quotations", {
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
            var oView = this.getView();
            if (utils._LCvalidateName(oView.byId("QF_id_CustomerName"), "ID") &&
            utils._LCvalidateMobileNumber(oView.byId("QF_id_CustMobile"), "ID") &&
            utils._LCvalidateMobileNumber(oView.byId("QF_id_EmpMobile"), "ID") &&
            utils._LCvalidateEmail(oView.byId("QF_id_CustEmail"), "ID") &&
            utils._LCvalidateAadharCard(oView.byId("QF_id_CustAadhar"), "ID") &&
            utils._LCvalidatePanCard(oView.byId("QF_id_CustPanNumber"), "ID") &&
            utils._LCvalidatePinCode(oView.byId("QF_id_CustPinCode"), "ID") &&
            utils._LCvalidateGstNumber(oView.byId("QF_id_CustGSTNo"), "ID") &&
            utils._LCvalidateMandatoryField(oView.byId("QF_id_CustAddress"), "ID") &&
            utils._LCvalidateMandatoryField(oView.byId("QF_id_VehModel"), "ID") &&
            utils._LCvalidateMandatoryField(oView.byId("QF_id_VehVariant"), "ID"))
            { return true } 
            else 
            { return false }
        }
    });
});