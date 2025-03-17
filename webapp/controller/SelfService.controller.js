sap.ui.define([
    "./BaseController", "../utils/validation", "sap/ui/model/json/JSONModel", "sap/m/MessageToast",
],
    function (BaseController, utils, JSONModel, MessageToast) {
        "use strict";
        return BaseController.extend("sap.kt.com.minihrsolution.controller.SelfService", {
            onInit: function () {
                this.getRouter().getRoute("RouteSelfService").attachMatched(this._onRouteMatched, this);
            },
            _onRouteMatched: function () {
                var oViewModel = new JSONModel({ isEditMode: false, Max: new Date() });
                this.getView().setModel(oViewModel, "viewModel");
                this.i18nModel=this.getView().getModel("i18n").getResourceBundle()
            },
            SS_onPressSignout: function () {
                this.getRouter().navTo("RouteLoginPage");
            },
            SS_onPressback: function () {
                this.getRouter().navTo("RouteTilePage");
            },
            //Education dialog open
            EdF_AddEdu: function () {
                if (!this.SEd_oDialog) {
                    sap.ui.core.Fragment.load({
                        name: "sap.kt.com.minihrsolution.fragment.AddEducation",
                        controller: this,
                    }).then(function (SEd_oDialog) {
                        this.SEd_oDialog = SEd_oDialog;
                        this.getView().addDependent(this.SEd_oDialog);
                        this.SEd_oDialog.open();
                    }.bind(this));
                } else {
                    this.SEd_oDialog.open();
                }
            },
            //Education dialog close
            AddEd_onCloseDial: function () {
                this.SEd_oDialog.close();
            },

            //Employment dialog open
            EmpF_onAddEmp: function () {
                if (!this.SEmp_oDialog) {
                    sap.ui.core.Fragment.load({
                        name: "sap.kt.com.minihrsolution.fragment.AddEmployment",
                        controller: this,
                    }).then(function (SEmp_oDialog) {
                        this.SEmp_oDialog = SEmp_oDialog;
                        this.getView().addDependent(this.SEmp_oDialog);
                        this.SEmp_oDialog.open();
                    }.bind(this));
                } else {
                    this.SEmp_oDialog.open();
                }
            },
            //Employment dialog close
            AddEmp_onClose: function () {
                this.SEmp_oDialog.close();
            },
            validateMobileNo: function (oEvent) {
                utils._LCvalidateMobileNumber(oEvent);
            },
            validateName: function (oEvent) {
                utils._LCvalidateName(oEvent);
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
            ValidateCommonFields: function (oEvent) {
                utils._LCvalidateMandatoryField(oEvent);
            },
            SS_onEditPress: function () {
                var isEditMode = this.getView().getModel("viewModel").getProperty("/isEditMode");
                if (isEditMode) {
                    if (this.SS_onSavePress()) {  // Call Save function and check validation
                        this.getView().getModel("viewModel").setProperty("/isEditMode", false);
                    }
                } else {
                    this.getView().getModel("viewModel").setProperty("/isEditMode", true);
                }
            },
            SS_onSavePress: function () {
                try {
                    if (utils._LCvalidateDate(this.byId("SS_id_Dob"), "ID") && utils._LCvalidateMandatoryField(this.byId("SS_id_PAddress"), "ID") && utils._LCvalidateMandatoryField(this.byId("SS_id_CAdress"), "ID") && utils._LCvalidateMobileNumber(this.byId("SS_id_MobileNo"), "ID") && utils._LCvalidateName(this.byId("SS_id_AcName"), "ID") && utils._LCvalidateAccountNo(this.byId("SS_id_Acno"), "ID") && utils._LCvalidateMandatoryField(this.byId("SS_id_BankName"), "ID") && utils._LCvalidateMandatoryField(this.byId("SS_id_Branch"), "ID") && utils._LCvalidateIfcCode(this.byId("SS_id_IfcsCode"), "ID") && utils._LCvalidateMandatoryField(this.byId("SS_id_Address"), "ID")
                        && utils._LCvalidatePanCard(this.byId("SS_id_Pan"), "ID") && utils._LCvalidateAadharCard(this.byId("SS_idAdhar"), "ID") && utils._LCvalidatePassport(this.byId("SS_id_Passport"), "ID") && utils._LCvalidateVoterId(this.byId("SS_id_Voterid"), "ID") && utils._LCvalidateName(this.byId("SS_id_EmeNameF"), "ID") && utils._LCvalidateMobileNumber(this.byId("SS_id_EmpMoF"), "ID") && utils._LCvalidateMandatoryField(this.byId("SS_id_AddF"), "ID") && utils._LCvalidateName(this.byId("SS_id_NameS"), "ID") && utils._LCvalidateMobileNumber(this.byId("SS_id_EmpMoS"), "ID") && utils._LCvalidateMandatoryField(this.byId("SS_id_EmpAddS"), "ID")) {
                        MessageToast.show(this.i18nModel.getText("dataSaved"));
                    }
                    else {
                        MessageToast.show(this.i18nModel.getText("mandetoryFields"));
                    }
                }
                catch {
                    MessageToast.show(this.i18nModel.getText("commonErrorMessage"));
                }
            },
        });
    });