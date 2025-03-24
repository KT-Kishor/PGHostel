sap.ui.define(
  ["./BaseController", "sap/m/MessageToast"],
  function (BaseController, MessageToast) {
    "use strict";
    return BaseController.extend(
      "sap.kt.com.minihrsolution.controller.TilePage",
      {
        onInit: function () {
          this.getRouter()
            .getRoute("RouteTilePage")
            .attachMatched(this._onRouteMatched, this);
        },

        TP_onupdatepress: function () {
          var oView = this.getView();
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
          this.oDialog.close();
        },
        RP_onPressSetSave: function () {
          var frgUserId = sap.ui
            .getCore()
            .byId("RP_id_userid")
            .getValue()
            .trim();
          var newPassword = sap.ui
            .getCore()
            .byId("RP_id_NewPW")
            .getValue()
            .trim();
          var confirmPassword = sap.ui
            .getCore()
            .byId("RP_id_ConfirmPW")
            .getValue()
            .trim();

          if (!newPassword) {
            MessageToast.show("Please enter a new password");
            return;
          }

          if (!confirmPassword) {
            MessageToast.show("Please confirm your password");
            return;
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
