sap.ui.define([
    "./BaseController",
    "../utils/validation",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast",
    "sap/m/MessageBox",
    "../model/formatter"
],
    function (BaseController, validation, JSONModel, MessageToast, MessageBox, Formatter) {
        "use strict";
        return BaseController.extend("sap.kt.com.minihrsolution.controller.Trainee", {
            Formatter: Formatter,
            onInit: function () {
                this.getRouter().getRoute("RouteTrainee").attachMatched(this._onRouteMatched, this);
            },
            _onRouteMatched: function () {
                this.i18nModel = this.getView().getModel("i18n").getResourceBundle();
                this.readCallForTrainee();
                this.byId("T_id_OnboardBtn").setVisible(false);
                this.byId("T_id_RejectBtn").setVisible(false);
                this.byId("T_id_Download").setVisible(false);
                this.getView().getModel("LoginModel").setProperty("/HeaderName", "Trainee Details");
            },
            readCallForTrainee: function () {
                var filter = { ID: "" }
                this.ajaxReadWithJQuery("Trainee", filter).then((oData) => {
                    var offerData = Array.isArray(oData.data) ? oData.data : [oData.data];
                    this.getView().setModel(new JSONModel(offerData), "traineeModel");
                    sap.ui.core.BusyIndicator.hide();
                }).catch((oError) => {
                    sap.ui.core.BusyIndicator.hide();
                    MessageBox.error("Error while reading the trainee details")
                })
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

            //certificate fragment
            T_onCertDownload: function () {
                if (!this.TC_oDialog) {
                    sap.ui.core.Fragment.load({
                        name: "sap.kt.com.minihrsolution.fragment.TraineeCertificate",
                        controller: this,
                    }).then(function (TC_oDialog) {
                        this.TC_oDialog = TC_oDialog;
                        this.getView().addDependent(this.TC_oDialog);
                        this.TC_oDialog.open();
                    }.bind(this));
                } else {
                    this.TC_oDialog.open();
                }
            },
            TCF_onPressCloseDialog: function () {
                this.TC_oDialog.close();
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
            //onboard trainee dialog
            T_onOnboardPress: function () {
                if (!this.TOb_oDialog) {
                    sap.ui.core.Fragment.load({
                        name: "sap.kt.com.minihrsolution.fragment.OnboardTrainee",
                        controller: this,
                    }).then(function (TOb_oDialog) {
                        this.TOb_oDialog = TOb_oDialog;
                        this.getView().addDependent(this.TOb_oDialog);
                        this.TOb_oDialog.open();
                    }.bind(this));
                } else {
                    this.TOb_oDialog.open();
                }
            },

            OTF_onPressClose: function () {
                this.TOb_oDialog.close();
            },
            //onboard trainee
            OTF_onPressOnboard: function () {
                try {
                    if (utils._LCvalidateEmail(sap.ui.getCore().byId("OTF_id_TraineeMail"), "ID")) {
                        MessageToast.show(this.i18nModel.getText("traineeOnboardSucess"));
                    }
                    else { MessageToast.show(this.i18nModel.getText("mandetoryFields")); }
                }
                catch { MessageToast.show(this.i18nModel.getText("commonErrorMessage")); }
            },
            T_onTableSelectionChange: function (oEvent) {
                var oSelectedItem = oEvent.getParameter("listItem");
                if (oSelectedItem) {
                    var sStatus = oSelectedItem.getBindingContext("traineeModel").getProperty("status");
                    this.ID = oSelectedItem.getBindingContext("traineeModel").getProperty("ID")
                    var isDisabled = sStatus === "OnBoarded" || sStatus === "Rejected";
                    this.byId("T_id_OnboardBtn").setVisible(!isDisabled);
                    this.byId("T_id_RejectBtn").setVisible(!isDisabled);
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
                    ? "Are you sure you want to onboard " + oContext.getProperty("nameSalutation") + " " + oContext.getProperty("traineeName") + "?"
                    : "Are you sure you want to reject " + oContext.getProperty("nameSalutation") + " " + oContext.getProperty("traineeName") + "?";
                var dialog = new sap.m.Dialog({
                    title: "Confirm Action",
                    type: "Message",
                    content: new sap.m.Text({ text: message }),
                    beginButton: new sap.m.Button({
                        text: "OK",
                        type: "Accept",
                        press: function () {
                            if (action === "onboard") {
                                that._handleOnboard(oContext);
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
            _handleOnboard: function (oContext) {
                oContext.getModel().setProperty(oContext.getPath() + "/status", "OnBoarded");
                MessageToast.show("Trainee onboarded successfully!");
            },
            _handleReject: function (oContext) {
                oContext.getModel().setProperty(oContext.getPath() + "/status", "Rejected");
                MessageToast.show("Trainee rejected successfully!");
            },
        });
    });