sap.ui.define(
  [
    "./BaseController",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/m/MessagePopover",
    "sap/m/MessageItem",
    "../utils/validation",
  ],
  function (
    BaseController,
    JSONModel,
    MessageToast,
    Filter,
    FilterOperator,
    MessagePopover,
    MessageItem,
    utils
  ) {
    "use strict";
    return BaseController.extend(
      "sap.kt.com.minihrsolution.controller.LoginPage",
      {
        onInit: function () {
          this.getRouter()
            .getRoute("RouteLoginPage")
            .attachMatched(this._onRouteMatched, this);
          var model = new JSONModel({
            EmployeeID: "",
            EmployeeName: "",
            url: "https://www.rest.kalpavrikshatechnologies.com/",
            headers: {
              "Content-Type": "application/json",
              name: "$2a$12$LC.eHGIEwcbEWhpi9gEA.umh8Psgnlva2aGfFlZLuMtPFjrMDwSui",
              password:
                "$2a$12$By8zKifvRcfxTbabZJ5ssOsheOLdAxA2p6/pdaNvv1xy1aHucPm0u",
            },
            isRadioVisible: false, // Initially, radio buttons are hidden
          });

          this.getOwnerComponent().setModel(model, "LoginModel");
        },
        onpresshome: function () {
          this.getRouter().navTo("RouteHomePage");
        },

        onValidateUserId: function (oEvent) {
          utils._LCvalidateMandatoryField(oEvent);
        },
        onValidateUsername: function (oEvent) {
          utils._LCvalidateName(oEvent);
        },

        onOtppress: function () {
          var oView = this.getView();
          var oModel = oView.getModel("LoginModel");

          var userId = oView.byId("idUserid").getValue().trim();
          var userName = oView.byId("idUsername").getValue().trim();
          var oOtpInput = oView.byId("idCaptchaInput");
          var oOtpLabel = oView.byId("idOtpLabel");
          var oOtpButton = oView.byId("idbtnsendotp");

          if (!userId || !userName) {
            MessageToast.show("Please enter User ID and Username.");
            return;
          }

          $.ajax({
            url: "https://www.rest.kalpavrikshatechnologies.com/SendOTP",
            type: "POST",
            contentType: "application/json",
            headers: {
              name: "$2a$12$LC.eHGIEwcbEWhpi9gEA.umh8Psgnlva2aGfFlZLuMtPFjrMDwSui",
              password:
                "$2a$12$By8zKifvRcfxTbabZJ5ssOsheOLdAxA2p6/pdaNvv1xy1aHucPm0u",
            },
            data: JSON.stringify({
              // FIXED: Converted data to JSON string
              EmployeeID: userId,
              EmployeeName: userName,
              Type: "OTP",
            }),
            success: function (response) {
              oOtpInput.setVisible(true);
              oOtpLabel.setVisible(true);
              oOtpButton.setText("Resend OTP");
              MessageToast.show(
                "OTP sent to your registered email address. Please enter the OTP to proceed."
              );
              // Validate response structure
              // if (
              //   !response ||
              //   !response.success ||
              //   !response.data ||
              //   response.data.length === 0
              // ) {
              //   MessageToast.show("Invalid credentials. Please try again.");
              //   oModel.setProperty("/isRadioVisible", false);
              //   return;
              // }

              // Check if user exists in response data
              // var userFound = response.data.some(function (user) {
              //   return (
              //     user.EmployeeID === userId && user.EmployeeName === userName
              //   );
              // });

              // if (userFound) {
              //   // MessageToast.show(
              //   //   "OTP sent to your registered email address. Please enter the OTP to proceed."
              //   // );
              //   oOtpButton.setText("Resend OTP");
              // } else {
              //   MessageToast.show("Invalid credentials. Please try again.");
              //   oOtpInput.setVisible(false);
              //   oOtpLabel.setVisible(false);
              // }
            },
            error: function (xhr, status, error) {
              MessageToast.show("Error verifying user. Please try again.");
            },
          });
        },

        // onLogin: function () {
        //   var that = this;
        //   var oView = this.getView();
        //   var userId = oView.byId("idUserid").getValue().trim();
        //   var userName = oView.byId("idUsername").getValue().trim();
        //   var userOtp = oView.byId("idCaptchaInput").getValue().trim();

        //   if (!userId || !userName) {
        //     MessageToast.show("Please enter User ID and Username.");
        //     return;
        //   }
        //   $.ajax({
        //     url: "https://www.rest.kalpavrikshatechnologies.com/LoginDetails",
        //     type: "GET",
        //     contentType: "application/json",
        //     headers: {
        //       name: "$2a$12$LC.eHGIEwcbEWhpi9gEA.umh8Psgnlva2aGfFlZLuMtPFjrMDwSui",
        //       password:
        //         "$2a$12$By8zKifvRcfxTbabZJ5ssOsheOLdAxA2p6/pdaNvv1xy1aHucPm0u",
        //     },
        //     data: JSON.stringify({
        //       EmployeeID: userId,
        //       EmployeeName: userName,
        //       OTP: userOtp,
        //     }),
        //     success: function (response) {
        //       MessageToast.show("Done");
        //       that.getRouter().navTo("RouteTilePage");
        //     },
        //     error: function (xhr, status, error) {
        //       MessageToast.show("Error Please try again.");
        //     },
        //   });
        // },
        onLogin: function () {
          this.getRouter().navTo("RouteTilePage");
        },
        onLoginOptionChange: function (oEvent) {
          var sSelectedButtonId = oEvent.getSource().getId();
          var oView = this.getView();

          // Get references to UI elements
          var oPasswordInput = oView.byId("idPasswordInput");
          var oPasswordLabel = oView.byId("idPasswordLabel");
          var oForgotPasswordLink = oView.byId("idForgotPasswordLink");
          var oSendotp = oView.byId("idbtnsendotp");

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
            oSendotp.setVisible(false);
          } else {
            // Show OTP input field
            // oOtpInput.setVisible(true);
            // oOtpLabel.setVisible(true);
            oSendotp.setVisible(true);

            // Hide password field and forgot password link
            oPasswordInput.setVisible(false);
            oPasswordLabel.setVisible(false);
            oForgotPasswordLink.setVisible(false);
          }
        },

        onForgotPassword: function () {
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
