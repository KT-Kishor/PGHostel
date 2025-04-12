sap.ui.define(
  [
    "./BaseController",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast",
    "../utils/validation",
  ],
  function (BaseController, JSONModel, MessageToast, utils) {
    "use strict";
    return BaseController.extend(
      "sap.kt.com.minihrsolution.controller.LoginPage",
      {
        onInit: function () {
          this.getRouter()
            .getRoute("RouteLoginPage")
            .attachMatched(this._onRouteMatched, this);
          var model = new JSONModel({
            // for Database connection
            url: "https://www.rest.kalpavrikshatechnologies.com/",
            headers: {
              name: "$2a$12$LC.eHGIEwcbEWhpi9gEA.umh8Psgnlva2aGfFlZLuMtPFjrMDwSui",
              password:
                "$2a$12$By8zKifvRcfxTbabZJ5ssOsheOLdAxA2p6/pdaNvv1xy1aHucPm0u",
              "Content-Type": "application/json",
            },
            isRadioVisible: false, // Initially, radio buttons are hidden
          });

          this.getOwnerComponent().setModel(model, "LoginModel");
        },
        _onRouteMatched: function () {
          var oView = this.getView();
          this.i18nModel = this.getView().getModel("i18n").getResourceBundle();
          oView.byId("Lp_id_PasswordRadio").setSelected(true);
          oView.byId("Lp_id_PasswordLabel").setVisible(true);
          oView.byId("Lp_id_PasswordInput").setVisible(true);
          oView.byId("Lp_id_ForgotPasswordLink").setVisible(true);

        },
        onpresshome: function () {
          this.getRouter().navTo("RouteHomePage");
        },
        //for validation purposes
        LP_onValidateUserId: function (oEvent) {
          utils._LCvalidateMandatoryField(oEvent);
        },
        LP_onValidateUsername: function (oEvent) {
          utils._LCvalidateName(oEvent);
        },
        SM_onChnageSetAndConfirm: function (oEvent) {
          utils._LCvalidatePassword(oEvent);
        },
        LP_onpresPassword(oEvent) {
          utils._LCvalidateMandatoryField(oEvent);
        },
        //for OTPsend
        LP_onOtppress: async function () {
          const oView = this.getView();
          const userId = oView.byId("Lp_id_Userid").getValue().trim();
          const userName = oView.byId("Lp_id_Username").getValue().trim();
          const oOtpInput = oView.byId("Lp_id_CaptchaInput");
          const oOtpLabel = oView.byId("Lp_id_OtpLabel");
          const oOtpButton = oView.byId("idbtnsendotp");

          // Validation
          if (
            utils._LCvalidateMandatoryField(oView.byId("Lp_id_Userid"), "ID") &&
            utils._LCvalidateName(oView.byId("Lp_id_Username"), "ID")
          ) {
            // Proceed
          } else {
            MessageToast.show(this.i18nModel.getText("validateUser"));
            return;
          }

          // Send OTP using same structure as NAF_onSubmitTask
          const response = await this.ajaxCreateWithJQuery("SendOTP", {
            EmployeeID: userId,
            EmployeeName: userName,
            Type: "OTP",
          });

          if (response && response.success === true) {
            oOtpInput.setVisible(true);
            oOtpLabel.setVisible(true);
            oOtpButton.setText(this.i18nModel.getText("msgresndotp"));
            MessageToast.show(this.i18nModel.getText("sentOTP"));
          } else {
            MessageToast.show(this.i18nModel.getText("errorMsguser"));
          }
        },

        LP_onLogin: async function () {
          const oView = this.getView();
          const oLoginModel = oView.getModel("LoginModel");

          const userId = oView.byId("Lp_id_Userid").getValue().trim();
          const userName = oView.byId("Lp_id_Username").getValue().trim();
          const userOtp = oView.byId("Lp_id_CaptchaInput").getValue().trim();
          const password = oView.byId("Lp_id_PasswordInput").getValue().trim();
          const isOtpLogin = oView.byId("Lp_id_OtpRadio").getSelected();
          const isPasswordLogin = oView
            .byId("Lp_id_PasswordRadio")
            .getSelected();

          // OTP is required when OTP login selected
          if (isOtpLogin && userOtp === "") {
            MessageToast.show(this.i18nModel.getText("checkOTP"));
            return;
          }
          // Mandatory field validations
          if (
            utils._LCvalidateMandatoryField(oView.byId("Lp_id_Userid"), "ID") &&
            utils._LCvalidateName(oView.byId("Lp_id_Username"), "ID") &&
            (!isPasswordLogin ||
              utils._LCvalidateMandatoryField(
                oView.byId("Lp_id_PasswordInput"),
                "ID"
              ))
          ) {
            try {
              const response = await this.ajaxReadWithJQuery("LoginDetails", {
                EmployeeID: userId,
                EmployeeName: userName,
                OTP: isOtpLogin ? userOtp : "",
                Password: isPasswordLogin ? password : "",
              });

              if (
                response.success === true &&
                response.data &&
                response.data.length > 0
              ) {
                const userData = response.data[0];

                if (
                  userId === userData.EmployeeID &&
                  userName === userData.EmployeeName
                ) {
                  // Save to model
                  oLoginModel.setProperty("/EmployeeID", userData.EmployeeID);
                  oLoginModel.setProperty(
                    "/EmployeeName",
                    userData.EmployeeName
                  );
                  oLoginModel.setProperty("/EmailID", userData.EmailID);
                  oLoginModel.setProperty("/Role", userData.Role);
                  oLoginModel.setProperty("/FolderID", response.FolderID);
                  oLoginModel.setProperty(
                    "/EducationalandDocumentsDetailFolderID",
                    userData.EducationalandDocumentsDetailFolderID
                  );
                  oLoginModel.setProperty(
                    "/EducationalandDocumentsDetailFolderID",
                    userData.EmploymentDetailFolderID
                  );
                  // Navigate
                  this.getRouter().navTo("RouteTilePage");
                  MessageToast.show(this.i18nModel.getText("logsuccess"));

                  // Reset fields
                  oView.byId("Lp_id_Userid").setValue("");
                  oView.byId("Lp_id_Username").setValue("");
                  oView
                    .byId("Lp_id_CaptchaInput")
                    .setValue("")
                    .setVisible(false);
                  oView
                    .byId("Lp_id_PasswordInput")
                    .setValue("")
                    .setVisible(false);
                  oView
                    .byId("idbtnsendotp")
                    .setText("Send OTP")
                    .setVisible(false);
                  oView.byId("Lp_id_OtpLabel").setVisible(false);
                  oView.byId("Lp_id_PasswordLabel").setVisible(false);
                  oView.byId("Lp_id_ForgotPasswordLink").setVisible(false);
                  oView.byId("Lp_id_OtpRadio").setSelected(false);
                  oView.byId("Lp_id_PasswordRadio").setSelected(false);
                } else {
                  MessageToast.show(this.i18nModel.getText("errorMsguser"));
                }
              } else {
                MessageToast.show(this.i18nModel.getText("loginFailed"));
              }
            } catch (error) {
              const errorMsg = error?.responseText
                ? JSON.parse(error.responseText).message
                : "Login failed due to an unexpected error.";
              MessageToast.show(errorMsg);
            }
          } else {
            MessageToast.show(this.i18nModel.getText("mandetoryFields"));
          }
        },

        onLoginOptionChange: function (oEvent) {
          var sSelectedButtonId = oEvent.getSource().getId();
          var oView = this.getView();
          // Get references to UI elements
          var oPasswordInput = oView.byId("Lp_id_PasswordInput");
          var oPasswordLabel = oView.byId("Lp_id_PasswordLabel");
          var oForgotPasswordLink = oView.byId("Lp_id_ForgotPasswordLink");
          var oSendotp = oView.byId("idbtnsendotp");
          var oOtpInput = oView.byId("Lp_id_CaptchaInput");
          var oOtpLabel = oView.byId("Lp_id_OtpLabel");

          if (sSelectedButtonId.includes("Lp_id_PasswordRadio")) {
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
            oSendotp.setVisible(true);

            // Hide password field and forgot password link
            oPasswordInput.setVisible(false);
            oPasswordLabel.setVisible(false);
            oForgotPasswordLink.setVisible(false);
          }
          if (sSelectedButtonId.includes("Lp_id_OtpRadio")) {
            this.oView.byId("Lp_id_Userid").setValueState("None");
            this.oView.byId("Lp_id_Username").setValueState("None");
            this.oView
              .byId("Lp_id_PasswordInput")
              .setValue("")
              .setValueState("None");
          } else {
            this.oView.byId("Lp_id_Userid").setValueState("None");
            this.oView.byId("Lp_id_Username").setValueState("None");
            this.oView
              .byId("Lp_id_PasswordInput")
              .setValue("")
              .setValueState("None");
          }
        },
        //Password login change event
        LP_onpasswordchange: function () {
          this.LP_onLogin();
        },
        //OTP login change event
        LP_onOTPchange: function () {
          this.LP_onLogin();
        },
        LP_onForgotPassword: function () {
          var oView = this.getView();
          if (!this.oPassforgot) {
            sap.ui.core.Fragment.load({
              name: "sap.kt.com.minihrsolution.fragment.Sendmail",
              controller: this,
            }).then(
              function (oPassforgot) {
                this.oPassforgot = oPassforgot;
                oView.addDependent(this.oPassforgot);
                this.oPassforgot.open();
                sap.ui.getCore().byId("FSM_id_SaveBTN").setEnabled(false);
                oView.byId("Lp_id_Userid").setValue("").setValueState("None");
                oView.byId("Lp_id_Username").setValue("").setValueState("None");
                oView
                  .byId("Lp_id_PasswordInput")
                  .setValue("")
                  .setValueState("None");
              }.bind(this)
            );
          } else {
            this.oPassforgot.open();
            sap.ui.getCore().byId("FSM_id_SaveBTN").setEnabled(false);
            oView.byId("Lp_id_Userid").setValue("").setValueState("None");
            oView.byId("Lp_id_Username").setValue("").setValueState("None");
          }
        },
        SM_onPressCancle: function () {
          var oUserIdInput = sap.ui.getCore().byId("FSM_id_userIdInput").setValue("").setValueState("None");
          var oUserNameInput = sap.ui.getCore().byId("FSM_id_userNameInput").setValue("").setValueState("None");
          var otpInput = sap.ui.getCore().byId("FSM_id_otpInput").setValue("").setValueState("None");
          var oNewPwInput = sap.ui.getCore().byId("FSM_id_newPasswordInput").setValue("").setValueState("None");
          var oConfirmPwInput = sap.ui
            .getCore()
            .byId("FSM_id_confirmPasswordInput").setValue("").setValueState("None");
          // Hide OTP, new password, and confirm password fields
          otpInput.setVisible(false);
          oNewPwInput.setVisible(false);
          oConfirmPwInput.setVisible(false);

          this.oPassforgot.close();
        },
        SM_onChangeSendOTP: async function () {
          const userfrgId = sap.ui
            .getCore()
            .byId("FSM_id_userIdInput")
            .getValue()
            .trim();
          const userfrgName = sap.ui
            .getCore()
            .byId("FSM_id_userNameInput")
            .getValue()
            .trim();
          const otplabel = sap.ui.getCore().byId("FSM_id_frgotp");
          const otpInput = sap.ui.getCore().byId("FSM_id_otpInput");
          const newpasslabel = sap.ui.getCore().byId("FSM_id_frgnewpass");
          const newpassinput = sap.ui.getCore().byId("FSM_id_newPasswordInput");
          const confirmpasslabel = sap.ui.getCore().byId("FSM_id_frgconpass");
          const conpassinput = sap.ui
            .getCore()
            .byId("FSM_id_confirmPasswordInput");

          // Basic validation
          if (!userfrgId || !userfrgName) {
            MessageToast.show(this.i18nModel.getText("validateUser"));
            return;
          }

          // Make API call using ajaxCreateWithJQuery
          const response = await this.ajaxCreateWithJQuery("SendOTP", {
            EmployeeID: userfrgId,
            EmployeeName: userfrgName,
            Type: "OTP",
          });

          if (response.success === true) {
            MessageToast.show(this.i18nModel.getText("sentOTP"));

            // Show OTP input
            otplabel.setVisible(true);
            otpInput.setVisible(true);
            otpInput.setValue("");

            // Hide password reset fields
            newpasslabel.setVisible(false);
            confirmpasslabel.setVisible(false);
            newpassinput.setVisible(false);
            conpassinput.setVisible(false);
          } else {
            MessageToast.show(this.i18nModel.getText("errorMsguser"));
          }
        },

        SM_onChangeOTP: async function () {
          const frgUserId = sap.ui
            .getCore()
            .byId("FSM_id_userIdInput")
            .getValue()
            .trim();
          const frgUserName = sap.ui
            .getCore()
            .byId("FSM_id_userNameInput")
            .getValue()
            .trim();
          const otpValue = sap.ui
            .getCore()
            .byId("FSM_id_otpInput")
            .getValue()
            .trim();
          const newpasslabel = sap.ui.getCore().byId("FSM_id_frgnewpass");
          const newpassinput = sap.ui.getCore().byId("FSM_id_newPasswordInput");
          const confirmpasslabel = sap.ui.getCore().byId("FSM_id_frgconpass");
          const conpassinput = sap.ui
            .getCore()
            .byId("FSM_id_confirmPasswordInput");

          if (!otpValue) {
            MessageToast.show(this.i18nModel.getText("rqForotp"));
            return;
          }
          const response = await this.ajaxReadWithJQuery("LoginDetails", {
            EmployeeID: frgUserId,
            EmployeeName: frgUserName,
            OTP: otpValue,
          });

          if (response.success === true) {
            sap.ui.getCore().byId("FSM_id_SaveBTN").setEnabled(true);
            MessageToast.show(this.i18nModel.getText("verifiedOTP"));

            newpasslabel.setVisible(true);
            newpassinput.setVisible(true);
            confirmpasslabel.setVisible(true);
            conpassinput.setVisible(true);
          } else {
            MessageToast.show(this.i18nModel.getText("invalidOTP"));
          }
        },
        SM_onTogglePasswordVisibility: function (oEvent) {
          var oInput = oEvent.getSource();
          var sType = oInput.getType() === "Password" ? "Text" : "Password";
          oInput.setType(sType);
          // Toggle the value help icon properly without losing the value
          var sIcon =
            sType === "Password" ? "sap-icon://show" : "sap-icon://hide";
          oInput.setValueHelpIconSrc(sIcon);
          // Ensure the current value of the password is retained
          var sCurrentValue = oInput.getValue();
          oInput.setValue(sCurrentValue);
        },
        LP_onTogglePasswordVisibility: function (oEvent) {
          var oInput = oEvent.getSource();
          var sType = oInput.getType() === "Password" ? "Text" : "Password";
          oInput.setType(sType);
          // Toggle the value help icon properly without losing the value
          var sIcon =
            sType === "Password" ? "sap-icon://show" : "sap-icon://hide";
          oInput.setValueHelpIconSrc(sIcon);
          // Ensure the current value of the password is retained
          var sCurrentValue = oInput.getValue();
          oInput.setValue(sCurrentValue);
        },
        SM_onPressSave: async function () {
          const oUserIdInput = sap.ui.getCore().byId("FSM_id_userIdInput");
          const oUserNameInput = sap.ui.getCore().byId("FSM_id_userNameInput");
          const oOtpInput = sap.ui.getCore().byId("FSM_id_otpInput");
          const oNewPwInput = sap.ui.getCore().byId("FSM_id_newPasswordInput");
          const oConfirmPwInput = sap.ui
            .getCore()
            .byId("FSM_id_confirmPasswordInput");

          const frgUserId = oUserIdInput.getValue().trim();
          const newPassword = oNewPwInput.getValue().trim();
          const confirmPassword = oConfirmPwInput.getValue().trim();
          // Validation
          if (
            !utils._LCvalidateMandatoryField(oUserIdInput, "ID") ||
            !utils._LCvalidateName(oUserNameInput, "ID") ||
            !utils._LCvalidatePassword(oNewPwInput, "ID") ||
            !utils._LCvalidatePassword(oConfirmPwInput, "ID")
          ) {
            MessageToast.show(this.i18nModel.getText("mandetoryFields"));
            return;
          }

          if (newPassword !== confirmPassword) {
            MessageToast.show(this.i18nModel.getText("misPasswords"));
            return;
          }
          const response = await this.ajaxUpdateWithJQuery("LoginDetails", {
            data: {
              Password: newPassword,
            },
            filters: {
              EmployeeID: frgUserId,
            },
          });

          if (response.success === true) {
            // Clear fields
            oUserIdInput.setValue("");
            oUserNameInput.setValue("");
            oOtpInput.setValue("").setVisible(false);
            oNewPwInput.setValue("").setVisible(false);
            oConfirmPwInput.setValue("").setVisible(false);

            if (this.oPassforgot) {
              this.oPassforgot.close();
            }

            MessageToast.show(this.i18nModel.getText("updatepassword"));
          } else {
            MessageToast.show("An error occurred: " + response.message);
          }
        },
      }
    );
  }
);
