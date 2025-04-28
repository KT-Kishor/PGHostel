sap.ui.define(
  [
    "./BaseController",
    "sap/m/MessageToast",
    "../utils/validation",
    "sap/ui/model/json/JSONModel",
    "sap/ui/core/BusyIndicator",
  ], function (BaseController, MessageToast, utils, JSONModel, BusyIndicator) {
    "use strict";
    return BaseController.extend(
      "sap.kt.com.minihrsolution.controller.TilePage",
      {
        onInit: function () {
          this.getRouter().getRoute("RouteTilePage").attachMatched(this._onRouteMatched, this);
        },
        _onRouteMatched: async function () {
          BusyIndicator.hide()
          this._fetchCommonData("AllLoginDetails", "EmpModel");
          this.i18nModel = this.getView().getModel("i18n").getResourceBundle();
          this.getView().getModel("Quotation").setProperty("/setDefFilter", true);
          this.AppVisibilityReadCall();
        },

        AppVisibilityReadCall: async function () {
          BusyIndicator.show(0);
          var LoginModel = this.getView().getModel("LoginModel").getData();
          await this.ajaxReadWithJQuery("AppVisibility", { Role: LoginModel.Role }, []).then((oData) => {
            var AppVisiblity = Array.isArray(oData.data) ? oData.data[0] : [oData.data[0]];
            this.getView().setModel(new JSONModel(AppVisiblity), "AppVisibilityModel");
            BusyIndicator.hide();
          }).catch((oError) => {
            BusyIndicator.hide();
          })
        },

        RP_onUseridpress: function (oEvent) {
          utils._LCvalidateMandatoryField(oEvent);
        },
        RP_onUsername: function (oEvent) {
          utils._LCvalidateName(oEvent);
        },
        RP_onChangnewpass: function (oEvent) {
          utils._LCvalidatePassword(oEvent);
        },
        RP_onChangcomfirmpass: function (oEvent) {
          utils._LCvalidateMandatoryField(oEvent);
        },

        RP_onSelectUser: function () {
          var that = this;
          var oEmpCombo = sap.ui.getCore().byId("RP_id_userid"); // User ID input field
          var selectedKey = oEmpCombo.getSelectedKey(); // Get selected user ID

          if (!selectedKey) {
            oEmpCombo.setValueState("Error");
            return;
          } else {
            oEmpCombo.setValueState("None");
          }
          var oEmpModel = this.getView().getModel("EmpModel"); // Fetch employee model
          if (!oEmpModel) {
            MessageToast.show(that.i18nModel.getText("noemp"));
            return;
          }
          var aEmployees = oEmpModel.getProperty("/"); // Get employee data array
          // Find selected employee by EmployeeID
          var selectedEmployee = aEmployees.find(function (emp) {
            return emp.EmployeeID === selectedKey;
          });
          if (selectedEmployee) {
            // Ensure FragmentModel exists
            var oFragmentModel = this.getView().getModel("FragmentModel");
            if (!oFragmentModel) {
              oFragmentModel = new JSONModel({});
              this.getView().setModel(oFragmentModel, "FragmentModel");
            }
            // Set EmployeeID and EmployeeName in the model
            oFragmentModel.setProperty(
              "/EmployeeID",
              selectedEmployee.EmployeeID
            );
            oFragmentModel.setProperty(
              "/EmployeeName",
              selectedEmployee.EmployeeName
            );
            // Automatically populate the username field
            var oUserNameInput = sap.ui.getCore().byId("RP_id_userName");
            oUserNameInput.setValue(selectedEmployee.EmployeeName);
            oUserNameInput.setValueState("None");
            // Clear password fields
            sap.ui.getCore().byId("RP_id_NewPW").setValue("").setValueState("None");
            sap.ui.getCore().byId("RP_id_ConfirmPW").setValue("").setValueState("None");
          } else {
            MessageToast.show(that.i18nModel.getText("empnotfound"));
          }
        },
        TP_onupdatepress: function () {
          var oView = this.getView();
          // Ensure user selection is reset before opening
          var oFragmentModel = this.getView().getModel("FragmentModel");
          if (oFragmentModel) {
            oFragmentModel.setData({ EmployeeID: "", EmployeeName: "" });
          }
          if (!this.oUpdatePass) {
            sap.ui.core.Fragment.load({
              name: "sap.kt.com.minihrsolution.fragment.ResetPassword",
              controller: this,
            }).then(
              function (oUpdatePass) {
                this.oUpdatePass = oUpdatePass;
                oView.addDependent(this.oUpdatePass);
                this.oUpdatePass.open();
              }.bind(this)
            );
          } else {
            this.oUpdatePass.open();
          }
        },
        RP_onPressCanclePW: function () {
          sap.ui.getCore().byId("RP_id_userid").setValue("").setSelectedKey("").setValueState("None");
          var oUserNameInput = sap.ui.getCore().byId("RP_id_userName");
          // Reset all input fields
          oUserNameInput.setValue("");
          oUserNameInput.setValueState("None");
          sap.ui.getCore().byId("RP_id_NewPW").setValue("").setValueState("None");
          sap.ui.getCore().byId("RP_id_ConfirmPW").setValue("").setValueState("None");
          // Close dialog
          if (this.oUpdatePass) {
            this.oUpdatePass.close();
          }
        },
        RP_onPressSetSave: async function () {
          const oUserIdInput = sap.ui.getCore().byId("RP_id_userid");
          const oUserNameInput = sap.ui.getCore().byId("RP_id_userName");
          const oNewPwInput = sap.ui.getCore().byId("RP_id_NewPW");
          const oConfirmPwInput = sap.ui.getCore().byId("RP_id_ConfirmPW");
          const frgUserId = oUserIdInput.getValue();
          const newPassword = oNewPwInput.getValue();
          const confirmPassword = oConfirmPwInput.getValue();
          // Validate inputs
          if (
            !utils._LCvalidateMandatoryField(oUserIdInput, "ID") ||
            !utils._LCvalidateName(oUserNameInput, "ID") ||
            !utils._LCvalidatePassword(oNewPwInput, "ID") ||
            !utils._LCvalidateMandatoryField(oConfirmPwInput, "ID")
          ) {
            MessageToast.show(this.i18nModel.getText("mandetoryFields"));
            return;
          }
          if (newPassword !== confirmPassword) {
            MessageToast.show(this.i18nModel.getText("misPasswords"));
            return;
          }
          try {
            const response = await this.ajaxUpdateWithJQuery("LoginDetails", {
              data: {
                Password: btoa(newPassword),
              },
              filters: {
                EmployeeID: frgUserId,
              },
            });
            if (response.success === true) {
              oUserIdInput.setValue(""); oUserNameInput.setValue(""); oNewPwInput.setValue(""); oConfirmPwInput.setValue("");
              const oModel = this.getView().getModel("EmpModel");
              if (oModel) {
                oModel.refresh(true);
              }
              if (this.oUpdatePass) {
                this.oUpdatePass.close();
              }

              MessageToast.show(this.i18nModel.getText("updatepassword"));
            } else {
              MessageToast.show("Failed to update password.");
            }
          } catch (err) {
            MessageToast.show("An error occurred: " + err.message);
          }
        },
        //password visibility change
        RP_onTogglePasswordVisibility: function (oEvent) {
          var oInput = oEvent.getSource();
          var sType = oInput.getType() === "Password" ? "Text" : "Password";
          oInput.setType(sType);

          // Toggle the value help icon properly without losing the value
          var sIcon =
            sType === "Password" ? "sap-icon://show" : "sap-icon://hide";
          oInput.setValueHelpIconSrc(sIcon);

          // Ensure the current value of the password is retained
          var sCurrentValue = oInput.getValue(); // Get the current value before toggling
          oInput.setValue(sCurrentValue);
        },

        TileV_onpressTrainee: function () {
          this.getRouter().navTo("RouteTrainee", { value: "Trainee" });
        },
        TileV_onPressOffer: function () {
          //this.getBusyDialog();
          this.getRouter().navTo("RouteEmployeeOffer", {
            valueEmp: "EmployeeOffer",
          });
        },
        TileV_onpresslistofholidays: function () {
          this.getRouter().navTo("RouteListofholidays");
        },
        TileV_onpressIDCARD: function () {
          this.getRouter().navTo("RouteIDCardApplication");
        },
        TileV_onpressLeave: function () {
          this.getRouter().navTo("RouteAdminApplyLeave");
        },
        TileV_onpressConsultantInvoice: function () {
          this.getRouter().navTo("RouteConsultantInvoiceApplication");
        },
        TileV_onpressContract: function () {
          this.getRouter().navTo("RouteContract", { valueEmp: "Contract" });
        },
        TileV_onPressAdminPaySlip: function () {
          this.getRouter().navTo("RouteAdminPaySlip");
        },
        TileV_onpressSelfservice: function () {
          this.getRouter().navTo("RouteSelfService");
        },
        TileV_onpressInbox: function () {
          this.getRouter().navTo("RouteMyInbox", { sMyInBox: "MyInboxView" });
        },
        TileV_onpressInvoiceApp: function () {
          this.getRouter().navTo("RouteCompanyInvoice", { sPath: "Invoice" });
        },
        TileV_onpressQuotation: function () {
          BusyIndicator.show(0);
          this.getRouter().navTo("RouteQuotation");
        },
        TileV_onpressAssignment: function () {
          this.getRouter().navTo("RouteManageAssignment");
        },
        TileV_onpresstimesheet: function () {
          this.getRouter().navTo("RouteTimesheet");
        },
        TileV_onPressTimesheetApp: function () {
          this.getRouter().navTo("RouteTimesheetApproval");
        },
        TileV_onPressGenerateSalary: function () {
          BusyIndicator.show(0);
          this.getRouter().navTo("RouteGenerateSalary");
        },
        TileV_onPressManagePayroll: function () {
          BusyIndicator.show(0);
          this.getRouter().navTo("RouteManagePayroll");
        },
        TileV_onpressEmployeeDetails: function () {
          this.getRouter().navTo("RouteEmployeeDetails");
        },
        TileV_onBackPress: function () {
          this.CommonLogoutFunction();
        },
        TileV_onpressAddCustomer: function () {
          BusyIndicator.show(0);
          this.getRouter().navTo("RouteManageCustomer", { value: "ManageCustomer" });
        },
        TileV_onpressMSA: function () {
          this.getRouter().navTo("RouteMSA");
        },
        TileV_onpressExpenseApp: function () {
          this.getBusyDialog();
          this.getRouter().navTo("RouteExpensePage");
        },
        TileV_onPressManageSchemeUpload: function () {
          this.getRouter().navTo("RouteSchemeUpload", {
            value: "SchemeUpload",
          });
        },
        TileV_onPressIncomeAsset: function () {
          this.getRouter().navTo("RouteIncomeAsset");
        },
        TileV_onPressAssetAssignment: function () {
          this.getRouter().navTo("RouteAssetAssignment");
        },
      }
    );
  }
);
