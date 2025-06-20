sap.ui.define(
  [
    "./BaseController",
    "sap/m/MessageToast",
    "../utils/validation",
    "sap/ui/model/json/JSONModel",
  ],
  function (BaseController, MessageToast, utils, JSONModel) {
    "use strict";
    return BaseController.extend(
      "sap.kt.com.minihrsolution.controller.TilePage",
      {
        onInit: function () {
          this.getRouter()
            .getRoute("RouteTilePage")
            .attachMatched(this._onRouteMatched, this);
        },
        _onRouteMatched: async function () {
          var LoginFunction = await this.commonLoginFunction("TilePage");
          if (!LoginFunction) return;
          this.scrollToSection("id_ObjectPageLayoutTile","id_Sectiontile");
          this.getBusyDialog();
          this.i18nModel = this.getView().getModel("i18n").getResourceBundle();
          this.AppVisibilityReadCall();
          await this._fetchCommonData("AllLoginDetails", "EmpModel");
          this.CreateEmployeeModel();
        },

        CreateEmployeeModel: function () {
          var empData = this.getView().getModel("EmpModel").getData() || [];
          var filteredData = empData.filter(function (item) {
            return item.Role !== "Trainee" && item.Role !== "Contractor";
          });
          var oFilteredModel = new JSONModel(filteredData);
          this.getOwnerComponent().setModel(oFilteredModel, "EmployeeModel");
        },

        AppVisibilityReadCall: async function () {
          try {
            const oLoginModel = this.getView().getModel("LoginModel");
            if (!oLoginModel) return;

            const { Role } = oLoginModel.getData();
            const oData = await this.ajaxReadWithJQuery(
              "AppVisibility",
              { Role },
              []
            );
            this.closeBusyDialog();

            const firstEntry = Array.isArray(oData.data)
              ? oData.data[0]
              : oData.data;
            this.getOwnerComponent().setModel(
              new JSONModel(firstEntry),
              "AppVisibilityModel"
            );

            const tileNames = ["Home", "Timesheet", "Payslip", "OfferGeneration", "Invoice", "Quotation", "Expense", "ManageAsset",];

            const tileKeys = firstEntry.TileKey?.split(",") || [];
            const tileMapping = tileNames.reduce((map, name, i) => {
              map[name] = tileKeys[i] || "0";
              return map;
            }, {});

            this.getView().setModel(new JSONModel(tileMapping), "TileAccessModel");
          } catch (oError) {
            MessageToast.show("Error in AppVisibilityReadCall");
          }
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
            sap.ui
              .getCore()
              .byId("RP_id_NewPW")
              .setValue("")
              .setValueState("None");
            sap.ui
              .getCore()
              .byId("RP_id_ConfirmPW")
              .setValue("")
              .setValueState("None");
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
          sap.ui
            .getCore().byId("RP_id_userid").setValue("").setSelectedKey("").setValueState("None");
              sap.ui.getCore().byId("RP_id_userid").setSelectedKey(null);
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
            sap.ui.getCore().byId("RP_id_ConfirmPW").setValueState("Error");
            MessageToast.show(this.i18nModel.getText("misPasswords"));
            return;
          }
          try {
            this.getBusyDialog();
            const response = await this.ajaxUpdateWithJQuery("LoginDetails", {
              data: {
                Password: btoa(newPassword),
              },
              filters: {
                EmployeeID: frgUserId,
              },
            });
            if (response.success === true) {
              this.closeBusyDialog();
              sap.ui.getCore().byId("RP_id_userid").setSelectedKey(null);
               sap.ui.getCore().byId("RP_id_ConfirmPW").setValueState("None");
              oUserIdInput.setValue("");
              oUserNameInput.setValue("");
              oNewPwInput.setValue("");
              oConfirmPwInput.setValue("");
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
        RP_onComPass: function () {
          const oNewPwInput = sap.ui.getCore().byId("RP_id_NewPW");
          const oConfirmPwInput = sap.ui.getCore().byId("RP_id_ConfirmPW");
          const newPassword = oNewPwInput.getValue();
          const confirmPassword = oConfirmPwInput.getValue();
          if (newPassword !== confirmPassword) {
            sap.ui.getCore().byId("RP_id_ConfirmPW").setValueState("Error");
            MessageToast.show(this.i18nModel.getText("misPasswords"));
            return;
          } else {
            sap.ui.getCore().byId("RP_id_ConfirmPW").setValueState("None");
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
          this.getRouter().navTo("SelfService", { sPath: "SelfService",Role: "Role" });
        },
        TileV_onpressInbox: function () {
          this.getRouter().navTo("RouteMyInbox", { sMyInBox: "MyInboxView" });
        },
        TileV_onpressInvoiceApp: function () {
          this.getRouter().navTo("RouteCompanyInvoice");
        },
        TileV_onpressQuotation: function () {
          sap.ui.core.BusyIndicator.show(0);
          this.getRouter().navTo("RouteQuotation");
        },
        TileV_onpressAssignment: function () {
          this.getRouter().navTo("RouteManageAssignment");
        }, TileV_onpresstimesheet: function () {
          this.getRouter().navTo("RouteTimesheet");
        },
        TileV_onPressTimesheetApp: function () {
          this.getRouter().navTo("RouteTimesheetApproval");
        },
        TileV_onPressGenerateSalary: function () {
     
          this.getRouter().navTo("RouteGenerateSalary");
        },
        TileV_onPressManagePayroll: function () {
        
          this.getRouter().navTo("RouteManagePayroll");
        },
        TileV_onpressEmployeeDetails: function () {
          this.getRouter().navTo("RouteEmployeeDetails", {
            sPath: "EmployeeDetails",
          });
        },
        TileV_onBackPress: function () {
          this.CommonLogoutFunction();
        },
        TileV_onpressAddCustomer: function () {
          this.getRouter().navTo("RouteManageCustomer", {
            value: "ManageCustomer",
          });
        },
        TileV_onpressMSA: function () {
          this.getRouter().navTo("RouteMSA");
        },
        TileV_onpressExpenseApp: function () {
          // this.getBusyDialog();
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
        TileV_onPressHrQuotation: function () {
          this.getRouter().navTo("RouteHrQuotation");
        },
        TileV_MyAsset: function () {
          this.getRouter().navTo("MyAsset");

        },
        TileV_onpressPoApp:function(){
          this.getRouter().navTo("PurchaseOrder");
        }
        
      }
    );
  }
);
