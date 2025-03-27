sap.ui.define([
    "./BaseController", "../utils/validation", "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast",
    "sap/m/MessageBox",
    "../model/formatter"],
    function (BaseController, utils, JSONModel, MessageToast, MessageBox, Formatter) {
        "use strict";
        return BaseController.extend("sap.kt.com.minihrsolution.controller.EmployeeOffer", {
            Formatter: Formatter,
            onInit: function () {
                this.getRouter().getRoute("RouteEmployeeOffer").attachMatched(this._onRouteMatched, this);
            },
            _onRouteMatched: function () {
                this.i18nModel = this.getView().getModel("i18n").getResourceBundle();
                this.readCallForEmployeeOffer("");
                this.byId("EO_id_OnboardBtn").setVisible(false);
                this.byId("EO_id_RejectBtn").setVisible(false);
                this._fetchCommonData("BaseLocation", "BaseLocationModel");
                this.getView().getModel("LoginModel").setProperty("/HeaderName", this.i18nModel.getText("headerEmpDetails"));
            },
            readCallForEmployeeOffer: function (filter) {
                this.ajaxReadWithJQuery("EmployeeOffer", filter).then((oData) => {
                    var offerData = Array.isArray(oData.data) ? oData.data : [oData.data];
                    this.getView().setModel(new JSONModel(offerData), "EmployeeOfferModel");
                    sap.ui.core.BusyIndicator.hide();
                }).catch((oError) => {
                    sap.ui.core.BusyIndicator.hide();
                    MessageBox.error("Error while reading the employee offer details")
                })
            },
            onPressback: function () {
                this.getRouter().navTo("RouteTilePage");
            },
            onLogout: function () {
                this.getRouter().navTo("RouteLoginPage");
            },
            EO_onPressEmployee: function (oEvent) {
                var oParValue, value;
                if (oEvent.getSource().getId().lastIndexOf("EO_id_AddEOffBut") !== -1) {
                    oParValue = "CreateOfferFlag"
                    value = "CreateOffer";
                } else {
                    oParValue = oEvent.getSource().getBindingContext("EmployeeOfferModel").getModel().getData()[oEvent.getSource().getBindingContextPath().split("/")[1]].ID
                    value = "UpdateOffer";
                }
                this.getRouter().navTo("RouteEmployeeOfferDetails", { sParOffer: oParValue ,
                    sParEmployee : value
                });
            },
            EO_onOnboardPress: function () {
                this._fetchCommonData("Designation", "DesignationModel");
                this._fetchCommonData("AppVisibility", "RoleModel");
                this._fetchCommonData("EmployeeDetails", "EmployeeModel");
                this.onHandleEmployeeAction("OnBoarded", "onBoardEmployee");
            },
            EO_onRejectPress: function () {
                this.onHandleEmployeeAction("Rejected", "onRejectEmployee");
            },
            EO_onSearch: function (oEvent) {
                var aFilterItems = this.byId("EO_id_FilterBar").getFilterGroupItems();
                var params = {};
                aFilterItems.forEach(function (oItem) {
                  var oControl = oItem.getControl(); // Get the associated control
                  var sValue = oItem.getName();
                  if (oControl && oControl.getValue()) {
                    params[sValue] = oControl.getValue();
                  }
                });
                var queryString = $.param({
                    params
                });
                this.readCallForEmployeeOffer(queryString)
            },
            // Update the status to 'Rejected' after confirmation
            onRejectEmployee: function () {
                this.updateCallForEmployeeOffer("Rejected");
            },
            onHandleEmployeeAction: function (status, actionMethod) {
                var oSelectedData = this.byId("EO_id_TableEOffer").getSelectedItem().getBindingContext("EmployeeOfferModel").getObject();
                this.oSelectedRow = oSelectedData
                var oEmpModelData = this.getView().getModel("EmployeeModel")
                var sName = oSelectedData.Salutation + " " + oSelectedData.ConsultantName;
                var that = this;
                // Confirm dialog before proceeding with status update
                var sMessage = (status === "OnBoarded")
                    ? that.i18nModel.getText("confirmOnboard", [sName])
                    : that.i18nModel.getText("confirmReject", [sName]);
                sap.m.MessageBox.confirm(sMessage, {
                    title: (status === "OnBoarded")
                        ? that.i18nModel.getText("confirmTitleOnboard")
                        : that.i18nModel.getText("confirmTitleReject"),
                    actions: [sap.m.MessageBox.Action.YES, sap.m.MessageBox.Action.NO],
                    onClose: function (oAction) {
                        if (oAction === sap.m.MessageBox.Action.YES) {
                            if (status === "OnBoarded") {
                                    const employeeIds = oEmpModelData.getData().length > 0 ?
                                    oEmpModelData.getData().filter(item => item.ID && item.ID.startsWith("KT"))
                                    .map(item => parseInt(item.ID.slice(2), 10))
                                    .filter(numericPart => !isNaN(numericPart)) : "";
                                  const lastIdNo = employeeIds.length > 0 ? Math.max(...employeeIds) : 0;
                                const newEmployeeID = "KT" + (lastIdNo + 1).toString().padStart(3, '0');

                                const oEmployeeDetailsModel = new sap.ui.model.json.JSONModel({
                                    ID: newEmployeeID,
                                    Salutation: oSelectedData.Salutation,
                                    EmployeeName: oSelectedData.ConsultantName,
                                    Role: " ",
                                    DateOfBirth: "",
                                    CompanyEmailID: "",
                                    PermanentAddress: oSelectedData.ConsultantAddress,
                                    CorrespondenceAddress: oSelectedData.ConsultantAddress,
                                    BaseLocation: oSelectedData.BaseLocation,
                                    AppraisalDate: oSelectedData.JoiningDate,
                                    Designation: oSelectedData.Designation,
                                    EmpOfferID: oSelectedData.ID,
                                    MobileNo: "",
                                    Manager: "",
                                    ManagerName: "",
                                    BloodGroup: "",
                                    EmployeeStatus: "Active",
                                });
                                that.getView().setModel(oEmployeeDetailsModel, "oEmpolyeeDetailsModel");
                                that._commonFragmentOpenOffer(that, "OnboardEmployee");
                            } else {
                                that[actionMethod]();
                            }
                        }
                    }
                });
            },
            _commonFragmentOpenOffer:function(){
                if (!this.oDialog) {
                    sap.ui.core.Fragment.load({
                      name: "sap.kt.com.minihrsolution.fragment.OnboardEmployee",
                      controller: this
                    }).then(dialog => {
                      this.oDialog = dialog;
                      this.getView().addDependent(this.oDialog);
                      this.oDialog.open();
                    })
                  } else {
                    this.oDialog.open();
                  }
            },
            OEF_onPressClose:function(){
                this.oDialog.close();
            },
            validateDate: function (oEvent) {
                utils._LCvalidateDate(oEvent);
            },
            validateEmail: function (oEvent) {
                utils._LCvalidateEmail(oEvent);
            },
            validateMobileNo: function (oEvent) {
                utils._LCvalidateMobileNumber(oEvent);
            },
            OEF_onPressOnBoard: function (oEvent) {
                var oModel = this.getView().getModel("oEmpolyeeDetailsModel").getData();
                if (utils._LCvalidateEmail(sap.ui.getCore().byId("OEF_id_CompanyMail"), "ID") && utils._LCvalidateDate(sap.ui.getCore().byId("OEF_id_DateofBirth"), "ID") && utils._LCvalidateMobileNumber(sap.ui.getCore().byId("OEF_id_Mobile"), "ID")) {
                  this.updateCallForEmployeeOffer("onBoarded")
                }
                else {
                    MessageToast.show(this.i18nModel.getText("mandetoryFields"));
                }
            },
            updateCallForEmployeeOffer : function(oStatus){
                this.oSelectedRow.Status = oStatus;
                var oModelOffer = {
                    "data": this.oSelectedRow,
                    "filters":{
                        "ID":this.oSelectedRow.ID
                    }
                }
                this.ajaxUpdateWithJQuery("EmployeeOffer",oModelOffer).then((oData) => {
                    if (oData.results) {
                        sap.ui.core.BusyIndicator.hide();
                        var sSuccessMessage = (status === "OnBoarded")
                        ? this.i18nModel.getText("successEmpOnboard")
                        : this.i18nModel.getText("successEmpReject");
                        MessageToast.show(sSuccessMessage);
                        this.oDialog.close();
                        this.readCallForEmployeeOffer("");
                    }
                }).catch((oError) => {
                    sap.ui.core.BusyIndicator.hide();
                    this.oDialog.close();
                    MessageToast.show(this.i18nModel.getText("commonErrorMessage"));
                })
            },
            EO_onSelectionRadRowE: function (oEvent) {
                var oSelectedItem = oEvent.getParameter("listItem");
                // If an item is selected, check the status and update button visibility accordingly
                if (oSelectedItem) {
                    var sStatus = oSelectedItem.getBindingContext("EmployeeOfferModel").getProperty("Status");
                    // this.ID = oSelectedItem.getBindingContext("EmployeeOfferModel").getProperty("ID")
                    var isDisabled = sStatus === "OnBoarded" || sStatus === "Rejected";
                    this.byId("EO_id_OnboardBtn").setVisible(!isDisabled);
                    this.byId("EO_id_RejectBtn").setVisible(!isDisabled);
                }
            }
        });
    });