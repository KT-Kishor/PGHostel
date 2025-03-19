sap.ui.define(
  [
    "./BaseController", //call base controller
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/m/MessagePopover",
    "sap/m/MessageItem",
  ],
  function (
    BaseController,
    JSONModel,
    MessageToast,
    Filter,
    FilterOperator,
    MessagePopover,
    MessageItem
  ) {
    "use strict";
    return BaseController.extend(
      "sap.kt.com.minihrsolution.controller.LoginPage",
      {
        onInit: function () {
          var model = new JSONModel({
            HeaderName: "",
            url: "https://www.rest.kalpavrikshatechnologies.com/",
            headers: {
              "Content-Type": "application/json",
              name: "$2a$12$LC.eHGIEwcbEWhpi9gEA.umh8Psgnlva2aGfFlZLuMtPFjrMDwSui",
              password:
                "$2a$12$By8zKifvRcfxTbabZJ5ssOsheOLdAxA2p6/pdaNvv1xy1aHucPm0u",
            },
          });
          this.getOwnerComponent().setModel(model, "LoginModel");
          var visibleName = {
            OTP: false,
            NewPassword: false,
            ConfirmPassword: false,
          };
          var visible = new JSONModel(visibleName);
          this.getView().setModel(visible, "visibleModel");
          this.visibleModel = this.getView().getModel("visibleModel");

          this.getRouter()
            .getRoute("RouteLoginPage")
            .attachMatched(this._onRouteMatched, this);
        },
        onpresshome: function () {
          this.getRouter().navTo("RouteHomePage");
        },
        onLogin: function () {
          var userid = this.byId("idUserid").getValue();
          var username = this.byId("idUsername").getValue();

          if (userid === "1" && username === "1") {
            this.getRouter().navTo("RouteTilePage");
          } else {
            MessageToast.show("Invalid credentials.");
          }
        },
        onLoginOptionChange: function (oEvent) {
          var sSelectedButtonId = oEvent.getSource().getId();
          var oView = this.getView();

          // Get references to UI elements
          var oPasswordInput = oView.byId("idPasswordInput");
          var oPasswordLabel = oView.byId("idPasswordLabel");
          var oForgotPasswordLink = oView.byId("idForgotPasswordLink");

          var oOtpInput = oView.byId("idCaptchaInput");
          var oOtpLabel = oView.byId("idOtpLabel");

          if (sSelectedButtonId.includes("idPasswordRadio")) {
            // Show password field and forgot password link
            oPasswordInput.setVisible(true);
            oPasswordLabel.setVisible(true);
            oForgotPasswordLink.setVisible(true);

            // Hide OTP field
            oOtpInput.setVisible(false);
            oOtpLabel.setVisible(false);
          } else {
            // Show OTP input field
            oOtpInput.setVisible(true);
            oOtpLabel.setVisible(true);

            // Hide password field and forgot password link
            oPasswordInput.setVisible(false);
            oPasswordLabel.setVisible(false);
            oForgotPasswordLink.setVisible(false);
          }
        },

        onForgotPassword: function () {
          this.visibleModel.setProperty("/OTP", false);
          this.visibleModel.setProperty("/NewPassword", false);
          this.visibleModel.setProperty("/ConfirmPassword", false);
          var oView = this.getView();
          if (!this.oDialog) {
            sap.ui.core.Fragment.load({
              name: "sap.kt.com.minihrsolution.fragment.Sendmail",
              controller: this,
            }).then(
              function (oDialog) {
                this.oDialog = oDialog;
                oView.addDependent(this.oDialog);
                this.oDialog.open();
                sap.ui.getCore().byId("idSaveBTN").setEnabled(false);
                this.modelFunction();
                sap.ui.getCore().byId("newPasswordInput").setValueState("None");
                sap.ui
                  .getCore()
                  .byId("confirmPasswordInput")
                  .setValueState("None");
              }.bind(this)
            );
          } else {
            this.oDialog.open();
            sap.ui.getCore().byId("idSaveBTN").setEnabled(false);
            this.modelFunction();
            sap.ui.getCore().byId("newPasswordInput").setValueState("None");
            sap.ui.getCore().byId("confirmPasswordInput").setValueState("None");
          }
        },
        onPressCancle: function () {
          this.oDialog.close();
        },
      }
    );
  }
);
