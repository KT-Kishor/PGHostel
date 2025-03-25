sap.ui.define(
  [
    "./BaseController",
    "sap/m/MessageToast",
    "../utils/validation",
    "sap/ui/model/json/JSONModel",
    "sap/ui/core/BusyIndicator",
  ],
  function (BaseController, MessageToast, utils, JSONModel, BusyIndicator) {
    "use strict";
    return BaseController.extend(
      "sap.kt.com.minihrsolution.controller.TilePage",
      {
        onInit: function () {
          this.getRouter()
            .getRoute("RouteTilePage")
            .attachMatched(this._onRouteMatched, this);
        },
        _onRouteMatched: function () {
          BusyIndicator.show(0);
          $.ajax({
            url: "https://www.rest.kalpavrikshatechnologies.com/AllLoginDetails",
            type: "GET",
            headers: {
              "Content-Type": "application/json",
              name: "$2a$12$LC.eHGIEwcbEWhpi9gEA.umh8Psgnlva2aGfFlZLuMtPFjrMDwSui",
              password:
                "$2a$12$By8zKifvRcfxTbabZJ5ssOsheOLdAxA2p6/pdaNvv1xy1aHucPm0u",
            },
            success: function (data) {
              BusyIndicator.hide();
              var oModel = new JSONModel(data);
              this.getOwnerComponent().setModel(oModel, "EmpModel");
            }.bind(this),
            error: function (err) {
              BusyIndicator.hide();
              MessageToast.show("An unexpected error occurred");
            }.bind(this),
          });
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

        RP_onSelectUser: function () {
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
            MessageToast.show("Employee data not found!");
            return;
          }

          var aEmployees = oEmpModel.getProperty("/data"); // Get employee data array

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
            MessageToast.show("Selected Employee not found!");
          }
        },

        TP_onupdatepress: function () {
          var oView = this.getView();

          // Ensure user selection is reset before opening
          var oFragmentModel = this.getView().getModel("FragmentModel");
          if (oFragmentModel) {
            oFragmentModel.setData({ EmployeeID: "", EmployeeName: "" });
          }

          if (!this.oDialog) {
            sap.ui.core.Fragment.load({
              name: "sap.kt.com.minihrsolution.fragment.ResetPassword",
              controller: this,
            }).then(
              function (oDialog) {
                this.oDialog = oDialog;
                oView.addDependent(this.oDialog);
                this.oDialog.open();
              }.bind(this)
            );
          } else {
            this.oDialog.open();
          }
        },
        RP_onPressCanclePW: function () {
          sap.ui
            .getCore()
            .byId("RP_id_userid")
            .setValue("")
            .setSelectedKey("")
            .setValueState("None");
          var oUserNameInput = sap.ui.getCore().byId("RP_id_userName");

          // Reset all input fields
          oUserNameInput.setValue("");
          oUserNameInput.setValueState("None");

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

          // Close dialog
          if (this.oDialog) {
            this.oDialog.close();
          }
        },
        RP_onPressSetSave: function () {
          var oUserIdInput = sap.ui.getCore().byId("RP_id_userid");
          var oUserNameInput = sap.ui.getCore().byId("RP_id_userName");
          var oNewPwInput = sap.ui.getCore().byId("RP_id_NewPW");
          var oConfirmPwInput = sap.ui.getCore().byId("RP_id_ConfirmPW");

          var frgUserId = oUserIdInput.getValue().trim();
          var newPassword = oNewPwInput.getValue().trim();
          var confirmPassword = oConfirmPwInput.getValue().trim();

          // Run validation checks
          if (
            !utils._LCvalidateMandatoryField(oUserIdInput, "ID") ||
            !utils._LCvalidateName(oUserNameInput, "ID") ||
            !utils._LCvalidatePassword(oNewPwInput, "ID") ||
            !utils._LCvalidatePassword(oConfirmPwInput, "ID")
          ) {
            MessageToast.show("Make sure all the mandatory fields entered");
            return; // Stops execution if validation fails
          }

          if (newPassword !== confirmPassword) {
            MessageToast.show("Passwords do not match");
            return;
          }

          var requestData = {
            data: {
              Password: newPassword,
            },
            filters: {
              EmployeeID: frgUserId,
            },
          };

          $.ajax({
            url: "https://www.rest.kalpavrikshatechnologies.com/LoginDetails",
            type: "PUT",
            contentType: "application/json",
            data: JSON.stringify(requestData), // Send data in the request body
            headers: {
              name: "$2a$12$LC.eHGIEwcbEWhpi9gEA.umh8Psgnlva2aGfFlZLuMtPFjrMDwSui",
              password:
                "$2a$12$By8zKifvRcfxTbabZJ5ssOsheOLdAxA2p6/pdaNvv1xy1aHucPm0u",
            },
            success: function (response) {
              // Clear all input fields after successful save
              oUserIdInput.setValue("");
              oUserNameInput.setValue("");
              oNewPwInput.setValue("");
              oConfirmPwInput.setValue("");

              // Refresh the model
              var oModel = sap.ui.getCore().getModel("EmpModel");
              if (oModel) {
                oModel.refresh(true);
              }

              // Close dialog if it exists
              if (this.oDialog) {
                this.oDialog.close();
              }

              MessageToast.show("Password updated successfully");
            }.bind(this),
            error: function (err) {
              MessageToast.show("An error occurred: " + err.responseText);
              console.error("AJAX Error:", err);
            }.bind(this),
          });
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
          this.getRouter().navTo("RouteTrainee");
        },
        TileV_onPressOffer: function () {
          this.getRouter().navTo("RouteEmployeeOffer");
        },
        TileV_onpresslistofholidays: function () {
          this.getRouter().navTo("RouteListofholidays", {
            Year: "Listofholidays",
          });
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
          this.getRouter().navTo("RouteContract");
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
          this.getRouter().navTo("RouteGenerateSalary");
        },
        TileV_onPressManagePayroll: function () {
          this.getRouter().navTo("RouteManagePayroll");
        },
        TileV_onpressEmployeeDetails: function () {
          this.getRouter().navTo("RouteEmployeeDetails");
        },
        TileV_onBackPress: function () {
          this.getRouter().navTo("RouteLoginPage");
        },
        TileV_onpressAddCustomer: function () {
          this.getRouter().navTo("RouteManageCustomer");
        },
        TileV_onpressMSA: function () {
          this.getRouter().navTo("RouteMSA");
        },
        TileV_onpressExpenseApp: function () {
          this.getRouter().navTo("RouteExpensePage");
        },
        TileV_onPressManageSchemeUpload: function () {
          this.getRouter().navTo("RouteSchemeUpload");
        },
      }
    );
  }
);
