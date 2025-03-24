sap.ui.define([
    "./BaseController",
    "../utils/validation",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast",
    "../model/formatter"
],
    function (BaseController, utils, JSONModel, MessageToast, Formatter) {
        "use strict";
        return BaseController.extend("sap.kt.com.minihrsolution.controller.TraineeDetails", {
            Formatter: Formatter,
            onInit: function () {
                this.getRouter().getRoute("RouteTraineeDetails").attachMatched(this._onRouteMatched, this);
            },
            _onRouteMatched: function (oEvent) {
                this.sArgPara = oEvent.getParameter("arguments").sParTrainee
                this.byId("TD_id_Wizard").getSteps()[0].setValidated(false);
                this.i18nModel = this.getView().getModel("i18n").getResourceBundle();
                this._fetchCommonData("Currency", "CurrencyModel");
                this.T_onResetWizard();
                var jsonData = {
                    "nameSalutation": "Mr.",
                    "traineeName": "",
                    "reportingManagerSalutation": "Mr.",
                    "reportingManager": "",
                    "stipend": "",
                    "joiningDate": this.Formatter.formatDate(new Date()),
                    "traineeEmail": ""
                }
                this.getView().setModel(new JSONModel(jsonData), "oTraineeDetails");
                var oViewModel = new JSONModel({ isEditMode: true, isVisiable: true, editable: false, isCTCVisible: false });
                this.getView().setModel(oViewModel, "viewModel");
                ["TD_id_Name", "TD_id_ReportingManager", "TD_id_EmailID", "TD_id_Stipend", "TD_id_JoiningDate"].forEach(function (ids) {
                    this.getView().byId(ids).setValueState("None");
                }.bind(this));

                if (this.sArgPara === "CreateTraineeFlag") {
                    this.getView().byId("TD_id_PageCreate").setVisible(true);
                    this.getView().byId("TUF_id_pageTrainee").setVisible(false);
                    this.T_onResetWizard();
                } else {
                    this.getView().byId("TD_id_PageCreate").setVisible(false);
                    this.getView().byId("TUF_id_pageTrainee").setVisible(true);
                    this.readCallForTraineeEdit(this.sArgPara);
                }
            },
            readCallForTraineeEdit: function (sArgPara) {
                var queryString = $.param({
                    "ID": sArgPara
                });
                this.ajaxReadWithJQuery("Trainee", queryString).then((oData) => {
                    var traineeData = Array.isArray(oData.data[0]) ? oData.data : [oData.data[0]];
                    this.getView().setModel(new JSONModel(traineeData[0]), "editTraineeModel");
                    sap.ui.core.BusyIndicator.hide();
                    var oViewModel = this.getView().getModel("viewModel");
                    if (traineeData.status === "OnBoarded") {
                        oViewModel.setProperty("/isVisiable", false);
                        oViewModel.setProperty("/ediBut", false);
                    } else if (traineeData.status === "Rejected") {
                        oViewModel.setProperty("/isVisiable", false);
                        oViewModel.setProperty("/ediBut", true);
                    } else if (traineeData.status === "Submitted") {
                        oViewModel.setProperty("/isVisiable", true);
                        oViewModel.setProperty("editBut", true);
                    }
                }).catch((oError) => {
                    sap.ui.core.BusyIndicator.hide();
                    MessageBox.error(this.i18nModel.getText("commonErrorMessage"))
                })
            },
            TUF_onPressback: function () {
                this.getRouter().navTo("RouteTrainee");
            },

            // Reset wizard to initial state
            T_onResetWizard: function () {
                var oWizard = this.getView().byId("TD_id_Wizard");
                oWizard.discardProgress(oWizard.getSteps()[0]); // Discard progress 
                oWizard.goToStep(oWizard.getSteps()[0]); // Go to the first step
            },
            TD_validateName: function (oEvent) {
                utils._LCvalidateName(oEvent);
                this.validateStep();
            },
            TD_validateEmail: function (oEvent) {
                utils._LCvalidateEmail(oEvent);
                this.validateStep();
            },
            TD_validateAmount: function (oEvent) {
                utils._LCvalidateAmount(oEvent);
                this.validateStep();
            },
            TD_validateDate: function (oEvent) {
                utils._LCvalidateDate(oEvent);
                this.validateStep();
            },
            TD_onPressback: function () {
                this.getRouter().navTo("RouteTrainee");
            },
            validateStep: function () {
                // Check if all fields have values
                var allFieldsFilled = this.getView().byId("TD_id_Name").getValue() && this.getView().byId("TD_id_ReportingManager").getValue() && this.getView().byId("TD_id_EmailID").getValue() && this.getView().byId("TD_id_Stipend").getValue() && this.getView().byId("TD_id_JoiningDate").getValue();
                if (allFieldsFilled) {
                    // Validate each field 
                    var isValid = utils._LCvalidateName(this.getView().byId("TD_id_Name"), "ID") && utils._LCvalidateName(this.getView().byId("TD_id_ReportingManager"), "ID") && utils._LCvalidateEmail(this.getView().byId("TD_id_EmailID"), "ID") && utils._LCvalidateAmount(this.getView().byId("TD_id_Stipend"), "ID") && utils._LCvalidateDate(this.getView().byId("TD_id_JoiningDate"), "ID");
                    this.byId("TD_id_Wizard").getSteps()[0].setValidated(isValid);
                } else {
                    this.byId("TD_id_Wizard").getSteps()[0].setValidated(false);
                }
            },

            TD_onSubmitData: function (oEvent) {
                if (this.byId("TD_id_Wizard").getSteps()[0].getValidated()) {
                    var oModel = this.getView().getModel("oTraineeDetails").getData();
                    oModel.status = "Submitted";
                    oModel = {
                        "tableName": "Trainee",
                        "data": oModel
                    };
                    this.ajaxCreateWithJQuery("Trainee", oModel).then((oData) => {
                        sap.ui.core.BusyIndicator.hide();
                        if (oData.results) {
                            this._showSuccessDialog(
                                this.i18nModel.getText("traineeDataSubmitted"),
                                "RouteTrainee",
                                this._generatePDF.bind(this)
                            );
                        }
                    }).catch((oError) => {
                        sap.ui.core.BusyIndicator.hide();
                        MessageToast.show(this.i18nModel.getText("commonErrorMessage"));
                    });
                } else {
                    MessageToast.show(this.i18nModel.getText("mandetoryFields"));
                }
            },
            TU_onEditOrSavePress: function () {
                var oViewModel = this.getView().getModel("viewModel");
                if (oViewModel.getProperty("/editable")) {
                    var isValid = utils._LCvalidateName(this.getView().byId("TU_id_Name"), "ID") && utils._LCvalidateName(this.getView().byId("TU_id_Manager"), "ID") && utils._LCvalidateEmail(this.getView().byId("TU_id_TraineeMail"), "ID") && utils._LCvalidateDate(this.getView().byId("TU_id_JoinDate"), "ID") && utils._LCvalidateAmount(this.getView().byId("TU_id_Stipend"), "ID");
                    // Save the changes
                    if (isValid) this.updateCallForTrainee(oViewModel);
                    else MessageToast.show(this.i18nModel.getText("mandetoryFields"));
                } else {
                    oViewModel.setProperty("/editable", true);
                    oViewModel.setProperty("/isEditMode", false);
                }

            },
            updateCallForTrainee: function (oViewModel) {
                var oModel = this.getView().getModel("editTraineeModel").getData();
                oModel = {
                    "data": oModel,
                    "filters": {
                        "ID": this.sArgPara
                    }
                }
                this.ajaxUpdateWithJQuery("EmployeeOffer", oModel).then((oData) => {
                    if (oData.results) {
                        oViewModel.setProperty("/editable", false);
                        oViewModel.setProperty("/isEditMode", true);
                        sap.ui.core.BusyIndicator.hide();
                        MessageToast.show(this.i18nModel.getText("traineeDataUpdated"));
                    }
                }).catch((oError) => {
                    sap.ui.core.BusyIndicator.hide();
                    MessageToast.show(this.i18nModel.getText("commonErrorMessage"));
                })
            },
        });
    });
