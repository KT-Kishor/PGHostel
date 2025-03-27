sap.ui.define([
    "./BaseController",
    "../utils/validation",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast",
    "../model/formatter",
    "sap/ui/core/BusyIndicator"
],
    function (BaseController, utils, JSONModel, MessageToast, Formatter, BusyIndicator) {
        "use strict";
        return BaseController.extend("sap.kt.com.minihrsolution.controller.TraineeDetails", {
            Formatter: Formatter,
            onInit: function () {
                this.getRouter().getRoute("RouteTraineeDetails").attachMatched(this._onRouteMatched, this);
            },
            _onRouteMatched: function (oEvent) {
                this.sArgPara = oEvent.getParameter("arguments").sParTrainee;
                this.byId("TD_id_Wizard").getSteps()[0].setValidated(false);
                this.i18nModel = this.getView().getModel("i18n").getResourceBundle();
                this._fetchCommonData("Currency", "CurrencyModel");
                this.T_onResetWizard();
                var jsonData = {
                    "NameSalutation": "Mr.",
                    "TraineeName": "",
                    "ReportingManagerSalutation": "Mr.",
                    "ReportingManager": "",
                    "Stipend": "",
                    "JoiningDate": this.Formatter.formatDate(new Date()),
                    "TraineeEmail": "",
                    "Currency":""
                };
                this.getView().setModel(new JSONModel(jsonData), "oTraineeDetails");
                var oViewModel = new JSONModel({ isEditMode: true, isVisiable: true, editable: false, isCTCVisible: false });
                this.getView().setModel(oViewModel, "viewModel");
                ["TD_id_Name", "TD_id_ReportingManager", "TD_id_EmailID", "TD_id_Stipend", "TD_id_JoiningDate",
                    "TU_id_Name", "TU_id_Manager", "TU_id_TraineeMail", "TU_id_JoinDate", "TU_id_Stipend"].forEach(function (ids) {
                        this.getView().byId(ids).setValueState("None");
                    }.bind(this));
                if (this.sArgPara === "CreateTraineeFlag") {
                    this.getView().byId("TD_id_PageCreate").setVisible(true);
                    this.getView().byId("TUF_id_pageTrainee").setVisible(false);
                    this.T_onResetWizard();
                } else {
                    this.getView().byId("TD_id_PageCreate").setVisible(false);
                    this.getView().byId("TUF_id_pageTrainee").setVisible(true);
                    this.getModelData(this.sArgPara);
                }
                this._makeDatePickersReadOnly(["TD_id_JoiningDate","TU_id_JoinDate"]);
            },
            getModelData: function (sArgPara) {
                var oModel = this.getOwnerComponent().getModel("traineeModel");
                if (!oModel) {
                    // Make read call to fetch the required data if the model doesn't exist
                    var queryString = $.param({
                        "ID": sArgPara
                    });
                    this.ajaxReadWithJQuery("Trainee", queryString).then((oData) => {
                        var traineeData = Array.isArray(oData.data[0]) ? oData.data : [oData.data[0]];
                        this.getOwnerComponent().setModel(new JSONModel(traineeData), "traineeModel");
                        this.getModelData(sArgPara);
                    }).catch((oError) => {
                        BusyIndicator.hide();
                        MessageBox.error(this.i18nModel.getText("commonErrorMessage"));
                    });
                    return;
                }
                var aFilteredData = oModel.getData().filter(function (oTrainee) {
                    return oTrainee.ID === sArgPara;
                });
                if (aFilteredData.length > 0) {
                    var traineeData = aFilteredData[0];
                    this.getView().setModel(new JSONModel(traineeData), "editTraineeModel");
                    var oViewModel = this.getView().getModel("viewModel");
                    if (traineeData.Status === "OnBoarded" || traineeData.Status === "Training Completed") {
                        oViewModel.setProperty("/isVisiable", false);
                        oViewModel.setProperty("/editBut", false);
                    } else if (traineeData.Status === "Rejected") {
                        oViewModel.setProperty("/isVisiable", false);
                        oViewModel.setProperty("/editBut", true);
                    } else if (traineeData.Status === "Submitted") {
                        oViewModel.setProperty("/isVisiable", true);
                        oViewModel.setProperty("editBut", true);
                    }
                } else {
                    MessageBox.error(this.i18nModel.getText("commonErrorMessage"));
                }
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
            //Submit trainee deatails 
            TD_onSubmitData: function (oEvent) {
                if (this.byId("TD_id_Wizard").getSteps()[0].getValidated()) {
                    var oModel = this.getView().getModel("oTraineeDetails").getData();
                    oModel.Currency = this.byId("TD_id_Currency").getSelectedKey();
                    oModel.Status = "Submitted";
                    oModel.JoiningDate = new Date(this.byId("TD_id_JoiningDate").getDateValue().getTime() - this.byId("TD_id_JoiningDate").getDateValue().getTimezoneOffset() * 60000).toISOString().split("T")[0];                  
                      var oPayload = {
                        "tableName": "Trainee",
                        "data": oModel
                    };
                    this.ajaxCreateWithJQuery("Trainee", oPayload).then((oData) => {
                        sap.ui.core.BusyIndicator.hide();
                        if (oData.results) {
                            MessageToast.show(this.i18nModel.getText("traineeDataSubmitted"));
                            this.getRouter().navTo("RouteTrainee");
                            sap.ui.core.BusyIndicator.hide();
                        }
                    }).catch((oError) => {
                        MessageToast.show(this.i18nModel.getText("commonErrorMessage"));
                        sap.ui.core.BusyIndicator.hide();
                    })
                }
                else {
                    MessageToast.show(this.i18nModel.getText("mandetoryFields"));
                }
            },
            //Edit/save button visibility 
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
            //Update trainee deatails 
            updateCallForTrainee: function (oViewModel) {
                var oModel = this.getView().getModel("editTraineeModel").getData();
                oModel.JoiningDate = new Date(
                    this.byId("TU_id_JoinDate").getDateValue().getTime() - this.byId("TU_id_JoinDate").getDateValue().getTimezoneOffset() * 60000 ).toISOString().split("T")[0];
                // Check and update the status if it is 'Rejected'
                if (oModel.Status === "Rejected") {
                    oModel.Status = "Submitted";
                }
                this.getView().getModel("editTraineeModel").refresh(true);
                oModel = {
                    "data": oModel,
                    "filters": {
                        "ID": this.sArgPara
                    }
                }; 
                // AJAX call for updating the data
                this.ajaxUpdateWithJQuery("Trainee", oModel).then((oData) => {
                    if (oData.results) {
                        oViewModel.setProperty("/editable", false);
                        oViewModel.setProperty("/isEditMode", true);
                        oViewModel.setProperty("/isVisiable", true);
                        oViewModel.setProperty("editBut", true);
                        sap.ui.core.BusyIndicator.hide();
                        MessageToast.show(this.i18nModel.getText("traineeDataUpdated"));
                    }
                }).catch((oError) => {
                    sap.ui.core.BusyIndicator.hide();
                    MessageToast.show(this.i18nModel.getText("commonErrorMessage"));
                });
            }

        });
    });
