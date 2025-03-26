sap.ui.define([
    "./BaseController",
    "../utils/validation",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast",
    "sap/m/MessageBox",
    "../model/formatter"
],
    function (BaseController, utils, JSONModel, MessageToast, MessageBox, Formatter) {
        "use strict";
        return BaseController.extend("sap.kt.com.minihrsolution.controller.Trainee", {
            Formatter: Formatter,
            onInit: function () {
                this.getRouter().getRoute("RouteTrainee").attachMatched(this._onRouteMatched, this);
            },
            _onRouteMatched: function () {
                this.i18nModel = this.getView().getModel("i18n").getResourceBundle();
                this.readCallForTrainee();
                this.byId("T_id_OnboardBtn").setEnabled(false);
                this.byId("T_id_RejectBtn").setEnabled(false);
                this.getView().getModel("LoginModel").setProperty("/HeaderName", "Trainee Details");
            },
            readCallForTrainee: function () {
                var filter = { ID: "" };
                this.ajaxReadWithJQuery("Trainee", filter).then((oData) => {
                    var offerData = Array.isArray(oData.data) ? oData.data : [oData.data];
                    var oModel = new sap.ui.model.json.JSONModel(offerData);
                    this.getOwnerComponent().setModel(oModel, "traineeModel");
                    sap.ui.core.BusyIndicator.hide();
                }).catch((oError) => {
                    sap.ui.core.BusyIndicator.hide();
                    MessageBox.error("Error while reading the trainee details");
                });
            },
            T_ValidateCommonFields: function (oEvent) {
                utils._LCvalidateMandatoryField(oEvent);
            },
            T_validateEmail: function (oEvent) {
                utils._LCvalidateEmail(oEvent);
            },
            onPressback: function () {
                this.getRouter().navTo("RouteTilePage");
            },
            onLogout: function () {
                this.getRouter().navTo("RouteLoginPage");
            },
            T_onPressAddTrainee: function (oEvent) {
                var oParValue;
                if (oEvent.getSource().getId().lastIndexOf("T_id_AddBtn") !== -1) {
                    oParValue = "CreateTraineeFlag"
                } else {
                    oParValue = oEvent.getSource().getBindingContext("traineeModel").getModel().getData()[oEvent.getSource().getBindingContextPath().split("/")[1]].ID
                }
                this.getRouter().navTo("RouteTraineeDetails", { sParTrainee: oParValue });
            },
            TC_commonOpenDialog: function (dialogProperty, fragmentName) {
                if (!this[dialogProperty]) {
                    sap.ui.core.Fragment.load({
                        name: fragmentName,
                        controller: this,
                    }).then(function (oDialog) {
                        this[dialogProperty] = oDialog;
                        this.getView().addDependent(this[dialogProperty]);
                        this[dialogProperty].open();
                    }.bind(this));
                } else {
                    this[dialogProperty].open();
                }
            },

            //certificate download dialog
            T_onCertDownload: function () {
                this.TC_commonOpenDialog("TC_oDialog", "sap.kt.com.minihrsolution.fragment.TraineeCertificate");
            },
            TCF_onPressCloseDialog: function () {
                this.TC_oDialog.close();
            },

            OTF_onPressClose: function () {
                this.TOb_oDialog.close();
            },

            //download certificate
            TCF_onPressDownload: function () {
                try {
                    if (utils._LCvalidateMandatoryField(sap.ui.getCore().byId("TCF_id_ProjectName"), "ID")) {
                        MessageToast.show(this.i18nModel.getText("downloadSucess"));
                    }
                    else {
                        MessageToast.show(this.i18nModel.getText("mandetoryFields"));
                    }
                }
                catch {
                    MessageToast.show(this.i18nModel.getText("commonErrorMessage"));
                }
            },

            T_onTableSelectionChange: function (oEvent) {
                var oSelectedItem = oEvent.getParameter("listItem");
                if (oSelectedItem) {
                    var sStatus = oSelectedItem.getBindingContext("traineeModel").getProperty("Status");            
                    var isDisabled = sStatus === "OnBoarded" || sStatus === "Rejected";
                    this.byId("T_id_OnboardBtn").setEnabled(!isDisabled);
                    this.byId("T_id_RejectBtn").setEnabled(!isDisabled);
            
                    var isCertificateVisible = sStatus === "OnBoarded";
                    this.byId("T_id_Download").setVisible(isCertificateVisible); // Ensure the button ID is correct
                }
            },
            T_onOnboardPress: function () {
                this.onHandleTraineeAction("onboard");
            },
            T_onRejectPress: function () {
                this.onHandleTraineeAction("reject");
            },
            onHandleTraineeAction: function (action) {
                var that = this;
                var oContext = this.byId("T_id_TraineeTable").getSelectedItem().getBindingContext("traineeModel");
                var message = (action === "onboard")
                    ? "Are you sure you want to onboard " + oContext.getProperty("NameSalutation") + " " + oContext.getProperty("TraineeName") + "?"
                    : "Are you sure you want to reject " + oContext.getProperty("NameSalutation") + " " + oContext.getProperty("TraineeName") + "?";
                var dialog = new sap.m.Dialog({
                    title: "Confirm Action",
                    type: "Message",
                    content: new sap.m.Text({ text: message }),
                    beginButton: new sap.m.Button({
                        text: "OK",
                        type: "Accept",
                        press: function () {
                            if (action === "onboard") {
                                // Open the OnboardTrainee fragment after onboarding logic
                                that.TC_commonOpenDialog("TOb_oDialog", "sap.kt.com.minihrsolution.fragment.OnboardTrainee");
                            } else if (action === "reject") {
                                that._handleReject(oContext);
                            }
                            dialog.close();
                        }
                    }),
                    endButton: new sap.m.Button({
                        text: "Cancel",
                        type: "Reject",
                        press: function () {
                            dialog.close();
                        }
                    }),
                    afterClose: function () {
                        dialog.destroy();
                    }
                });
                dialog.open();
            },
            _handleReject: function (oContext) {
                var that = this;                
                oContext.getModel().setProperty(oContext.getPath() + "/Status", "Rejected");
                that.updateCallForTrainee("Rejected", oContext.getObject());
                MessageToast.show(this.i18nModel.getText("traineeRejectSucess"));
            },            
            OTF_onPressOnboard: function () {
                try {
                    if (utils._LCvalidateEmail(sap.ui.getCore().byId("OTF_id_TraineeMail"), "ID")) {
                        var oContext = this.byId("T_id_TraineeTable").getSelectedItem().getBindingContext("traineeModel");   
                        // Update UI Model
                        oContext.getModel().setProperty(oContext.getPath() + "/Status", "OnBoarded");
                        // Prepare Data for Update Call
                        this.updateCallForTrainee("OnBoarded", oContext.getObject());
                        MessageToast.show(this.i18nModel.getText("traineeOnboardSucess"));
                        this.TOb_oDialog.close();
                    } else {
                        MessageToast.show(this.i18nModel.getText("mandetoryFields"));
                    }
                } catch {
                    MessageToast.show(this.i18nModel.getText("commonErrorMessage"));
                }
            },
            updateCallForTrainee: function (oStatus, oTraineeData) {
                var that = this;
                oTraineeData.Status = oStatus;
                if (oStatus === "OnBoarded") {
                    oTraineeData.CompanyEmailID = sap.ui.getCore().byId("OTF_id_TraineeMail").getValue();
                } 
                var oModelOffer = {
                    "data": oTraineeData,
                    "filters": {
                        "ID": oTraineeData.ID
                    }
                };  
                sap.ui.core.BusyIndicator.show(0);
                this.ajaxUpdateWithJQuery("Trainee", oModelOffer).then((oData) => {
                    sap.ui.core.BusyIndicator.hide();
                    if (oData.results) {
                        that.readCallForTrainee();
                    }
                }).catch((oError) => {
                    sap.ui.core.BusyIndicator.hide();
                    MessageToast.show(that.i18nModel.getText("commonErrorMessage"));
                });
            }
        });
    });