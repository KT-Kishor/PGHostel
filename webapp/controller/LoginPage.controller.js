sap.ui.define([
    "./BaseController", //call base controller
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/m/MessagePopover",
    "sap/m/MessageItem"

],
    function (BaseController, JSONModel, MessageToast, Filter, FilterOperator, MessagePopover, MessageItem) {
        "use strict";
        return BaseController.extend("sap.kt.com.minihrsolution.controller.LoginPage", {
            onInit: function () {
                this.getRouter().getRoute("RouteLoginPage").attachMatched(this._onRouteMatched, this);
            },

            // Attach the _onRouteMatched method
            _onRouteMatched: function () {
                // this.commonLoginFunction();
                var newModel = new JSONModel();
                this.getOwnerComponent().setModel(newModel, "TextDisplay");
                this.byId("idOTP").setVisible(false);
                // Reset the 'loginModel' to its initial state
                var oModel = new JSONModel({
                    "userIds": "",
                    "userNames": "",
                    "sendEmail": false,
                    "sendEmailForm": true
                });
                this.getOwnerComponent().setModel(oModel, "loginModel")
                this.byId("idCaptchaInput").setValueState("None");
                this.i18nModel = this.getView().getModel("i18n").getResourceBundle();
                this.oModel = this.getOwnerComponent().getModel();
                this.byId("idEyeIcon").setVisible(false);
            },

            //login function 
            Login: function () {
                var that = this;
                var model = this.getView().getModel("loginModel");
                var userId = model.oData.userIds;
                var userName = model.oData.userNames;
                if (!userId || !userName) {
                    this.byId("idOTP").setVisible(false);
                } else {
                    this.oModel.read("/Login", {
                        filters: [
                            new Filter("EmployeeID", FilterOperator.EQ, userId),
                            new Filter("EmployeeName", FilterOperator.EQ, userName)
                        ],
                        success: function (oData) {
                            that.byId("idOTP").setVisible(true);
                            that.byId("idOTP").setText("Send OTP");
                            if (oData.results && oData.results.length > 0) {
                                that.loggedInUser = oData.results[0];
                                model.setProperty("/EmploymentDetailFolderID", oData.results[0].EmploymentDetailFolderID);
                                model.setProperty("/ExpenseFolderID", oData.results[0].ExpenseFolderID);
                                model.setProperty("/EmailID", oData.results[0].EmailID);
                                model.setProperty("/FolderID", oData.results[0].EducationalandDocumentsDetailFolderID);
                            } else {
                                MessageToast.show(that.i18nModel.getText("userdata"));
                            }
                        },
                        error: function (error) {
                            MessageToast.show(JSON.parse(error.responseText).error.message.value);
                            that.byId("idOTP").setVisible(false);
                        }
                    });
                }
            },

            //Otp send Function
            SendOtp: function () {
                this.byId("idCaptchaInput").setValue("")
                var that = this;
                if (that.loggedInUser && that.loggedInUser.EmailID) {
                    var jsonAllData = {
                        "data": {
                            "EmailID": that.loggedInUser.EmailID,
                            "Name": that.loggedInUser.EmployeeName,
                            "EmpID": that.loggedInUser.EmployeeID
                        },
                        "type": "OTP"
                    };
                    this.oModel.create("/sendOTP", jsonAllData, {
                        success: function (oData) {
                            that.byId("idOTP").setText(that.i18nModel.getText("resendOTP"));
                            MessageToast.show(that.i18nModel.getText("viewOTPSuccessMess"));
                            that.byId("idEyeIcon").setVisible(true);
                        },
                        error: function (error) {
                            MessageToast.show(that.i18nModel.getText("otpError"), error);
                        }
                    });
                } else {
                    MessageToast.show(that.i18nModel.getText("msgUser"));
                }
            },
            //login function with validation
            onLogin: function () {
                var that = this;
                var captchaInput = this.byId("idCaptchaInput").getValue();
                if (captchaInput) {
                    var jsonData = {
                        "OTP": captchaInput,
                        "EmpID": that.loggedInUser.EmployeeID,
                    }
                    this.oModel.create("/loginData", jsonData, {
                        success: function (oData) {
                            if (oData.loginData.TimeDate) {
                                const currentTime = new Date().getTime();
                                const loginTime = new Date(oData.loginData.TimeDate).getTime();
                                const timeDifference = currentTime - loginTime;
                                // if (timeDifference <= 120000) {
                                    that.getOwnerComponent().getModel("loginModel").getData().Type = oData.loginData.Role;
                                    that.getRouter().navTo("RouteTileAdminView");
                                // } else {
                                //     MessageToast.show(that.i18nModel.getText("otpExp"));
                                //     that.getRouter().navTo("RouteLogin");
                                // }
                            } else {
                                MessageToast.show(that.i18nModel.getText("loginMis"));
                            }
                        },
                        error: function (error) {
                            MessageToast.show(JSON.parse(error.responseText).error.message.value)
                        }
                    })
                } else {
                    MessageToast.show(that.i18nModel.getText("otpEnter"));
                }
            },

            // login submit
            onLoginSubmit: function () {
                this.onLogin()
            },

            //navigate to contact view
            onpressContact: function () {
                this.getRouter().navTo("Routecontact")
            },
            onPressIcon: function (oEvent) {
                // Create the ResponsivePopover only once
                if (!this._oResponsivePopover) {
                    this._oResponsivePopover = new sap.m.ResponsivePopover({
                        title: "Information Message",
                        placement: "Bottom", // Open the popover below the triggering element
                        showHeader: true,
                        content: [
                            new sap.m.List({
                                items: {
                                    path: "/messages",
                                    template: new sap.m.CustomListItem({
                                        content: new sap.m.VBox({
                                            width: "320px", // Set the width of the message container
                                            height: "60px", // Set the height of the message container
                                            items: [
                                                new sap.m.Text({
                                                    text: "{description}",
                                                    wrapping: true,
                                                    width: "100%" // Allow full width
                                                }).addStyleClass("sapUiTinyMargin")
                                            ]
                                        })
                                    })
                                }
                            })
                        ]
                    });

                    // Add it as a dependent to the view
                    this.getView().addDependent(this._oResponsivePopover);
                }

                // Set messages dynamically
                var oMessageModel = new sap.ui.model.json.JSONModel({
                    messages: [
                        {
                            type: "sap-icon://message-information", // Direct icon
                            title: "Information Message",
                            description: this.i18nModel.getText("viewOTPExpire")
                        }
                    ]
                });

                // Set the model for the popover
                this._oResponsivePopover.setModel(oMessageModel);
                this._oResponsivePopover.setContentHeight(""); // Allow dynamic height
                this._oResponsivePopover.setVerticalScrolling(false); // Disable vertical scrolling
                this._oResponsivePopover.setHorizontalScrolling(false);

                // Open the ResponsivePopover
                this._oResponsivePopover.openBy(oEvent.getSource());
            },


            //navigate to home view
            onpresshome: function () {
                sap.m.URLHelper.redirect("https://www.kalpavrikshatechnologies.com", false);
            }
        });
    });