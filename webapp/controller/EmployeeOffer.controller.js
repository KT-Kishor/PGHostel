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
                this.readCallForEmployeeOffer();
                this.byId("EO_id_OnboardBtn").setVisible(false);
                this.byId("EO_id_RejectBtn").setVisible(false);
                this._fetchCommonData("BaseLocation", "BaseLocationModel");
                this.getView().getModel("LoginModel").setProperty("/HeaderName", this.i18nModel.getText("headerEmpDetails"));
            },
            readCallForEmployeeOffer: function () {
                var filter = { ID: "" }
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
                var oParValue;
                if(oEvent.getSource().getId().lastIndexOf("EO_id_AddEOffBut") !== -1){
                   oParValue = "CreateOfferFlag"
                }else{
                    oParValue = oEvent.getSource().getBindingContext("EmployeeOfferModel").getModel().getData()[oEvent.getSource().getBindingContextPath().split("/")[1]].ID
                }
                this.getRouter().navTo("RouteEmployeeOfferDetails",{sParOffer : oParValue});
            },
            EO_onOnboardPress: function () {
                this._fetchCommonData("Designation", "DesignationModel");
                this._fetchCommonData("AppVisibility", "RoleModel");
                this._fetchCommonData("EmployeeDetails", "EmployeeModel");
                this.onHandleEmployeeAction("OnBoarded", "onBoardEmployee");
            },
            onHandleEmployeeAction: function (status, actionMethod) {
                var oSelectedData = this.byId("EO_id_TableEOffer").getSelectedItem().getBindingContext("EmployeeOfferModel").getObject();
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
                        //     const employeeIds = oEmpModelData.getData().length > 0 ?
                        //     oEmpModelData.filter(item => item.ID && item.ID.startsWith("KT"))
                        //     .map(item => parseInt(item.ID.slice(2), 10))
                        //     .filter(numericPart => !isNaN(numericPart)) : "";
                        //   const lastIdNo = employeeIds.length > 0 ? Math.max(...employeeIds) : 0;
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
                            EmployeeStatus: "Active"
                          });
                          this.getView().setModel(oEmployeeDetailsModel, "oEmpolyeeDetailsModel");
                          this._commonFragmentOpen(this, "OnboardEmployee");
                      } else {
                        that[actionMethod](oContext);
                      }
                    }
                  }
                });
            },
            OEF_onPressClose: function () {
                this._commonFragmentClose(this, "OnboardEmployee");
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
                if (utils._LCvalidateEmail(sap.ui.getCore().byId("OEF_id_CompanyMail"), "ID") && utils._LCvalidateDate(sap.ui.getCore().byId("OEF_id_DateofBirth"), "ID") && utils._LCvalidateMobileNumber(sap.ui.getCore().byId("OEF_id_Mobile"), "ID")) {
                    MessageToast.show(this.i18nModel.getText("onBoardSuccess"));
                }
                else {
                    MessageToast.show(this.i18nModel.getText("mandetoryFields"));
                }
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