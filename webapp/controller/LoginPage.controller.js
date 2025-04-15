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
          const model = new JSONModel({
            // for Database connection
            url: "https://www.rest.kalpavrikshatechnologies.com/",
            headers: {
              name: "$2a$12$LC.eHGIEwcbEWhpi9gEA.umh8Psgnlva2aGfFlZLuMtPFjrMDwSui",
              password:
                "$2a$12$By8zKifvRcfxTbabZJ5ssOsheOLdAxA2p6/pdaNvv1xy1aHucPm0u",
              "Content-Type": "application/json",
            },
            isRadioVisible: false,
          });
          this.getOwnerComponent().setModel(model, "LoginModel");
        },
        _onRouteMatched: function () {
          this.i18nModel = this.getView().getModel("i18n").getResourceBundle();
          var oLoginModel = new JSONModel({
            "userId": "",
            "userName": "",
            "password": "",
            "otp": "",
            "isPasswordSelected": true,
            "isOtpSelected": false,
            "isPasswordVisible": true,
            "isOtpVisible": false,
            "isSendOtpVisible": false,
            "isForgotPasswordVisible": true,
            "sendOtpText": "Send OTP",
            "passwordValueState": "None",

            "frgUserId": "",
            "frgUserIdValueState": "None",
            "frgUserName": "",
            "frgUserNameValueState": "None",
            "frgOtp": "",
            "frgOtpValueState": "None",
            "frgOtpVisible": false,
            "frgNewPassword": "",
            "frgNewPasswordValueState": "None",
            "frgNewPasswordVisible": false,
            "frgConfirmPassword": "",
            "frgConfirmPasswordValueState": "None",
            "frgConfirmPasswordVisible": false
          });
          this.getView().setModel(oLoginModel, "LoginViewModel");
          //this.LoginModel = oLoginModel;
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
        LP_onOtppress: function () {
          const oModel = this.getView().getModel("LoginViewModel");
          // Validation
          if (
            !utils._LCvalidateMandatoryField(this.byId("Lp_id_Userid"), "ID") ||
            !utils._LCvalidateName(this.byId("Lp_id_Username"), "ID")
          ) {
            MessageToast.show(this.i18nModel.getText("validateUser"));
            return;
          }
          // Send OTP via AJAX
          try {
            this.ajaxCreateWithJQuery("SendOTP", {
              EmployeeID: oModel.getProperty("/userId"),
              EmployeeName: oModel.getProperty("/userName"),
              Type: "OTP"
            }).then((response) => {
              if (response && response.success === true) {
                oModel.setProperty("/isOtpVisible", true);
                oModel.setProperty("/isSendOtpVisible", true);
                oModel.setProperty("/sendOtpText", this.i18nModel.getText("msgresndotp"));
                MessageToast.show(this.i18nModel.getText("sentOTP"));
              } else {
                MessageToast.show(this.i18nModel.getText("errorMsguser"));
              }
            }).catch((error) => {
              MessageToast.show(this.i18nModel.getText(error.responseJSON.message));
            });
          } catch (err) {
            // Fallback error (in case .then/.catch block fails)
            MessageToast.show(this.i18nModel.getText("errorMsguser"));
          }
        },
        LP_onLogin: function () {
          this.getRouter().navTo("RouteTilePage");
          const oLoginModel = this.getView().getModel("LoginModel");
          const oVM = this.getView().getModel("LoginViewModel");
          // Validate User ID and Name
          if (
            !utils._LCvalidateMandatoryField(this.byId("Lp_id_Userid"), "ID") ||
            !utils._LCvalidateName(this.byId("Lp_id_Username"), "ID")
          ) {
            MessageToast.show(this.i18nModel.getText("mandetoryFields"));
            return;
          }
          // Validate OTP if selected
          if (oVM.getProperty("/isOtpSelected") && !oVM.getProperty("/otp")) {
            MessageToast.show(this.i18nModel.getText("checkOTP"));
            return;
          }
          // Validate Password if selected
          if (oVM.getProperty("/isPasswordSelected")) {
            const isPasswordValid = utils._LCvalidateMandatoryField(this.byId("Lp_id_PasswordInput"), "ID");
            if (!isPasswordValid) {
              MessageToast.show(this.i18nModel.getText("mandetoryFields"));
              return;
            }
          }
          // Backend call using then-catch
          try {
            this.ajaxReadWithJQuery("LoginDetails", {
              EmployeeID: oVM.getProperty("/userId"),
              EmployeeName: oVM.getProperty("/userName"),
              OTP: oVM.getProperty("/isOtpSelected") ? oVM.getProperty("/otp") : "",
              Password: oVM.getProperty("/isPasswordSelected") ? oVM.getProperty("/password") : ""
            })
              .then((response) => {
                if (response?.success && response.data?.length > 0) {
                  const userData = response.data[0];
                  var timeDifference = new Date().getTime() - new Date(userData.TimeDate).getTime();
                  if (timeDifference <= 6000) {
                    MessageToast.show(this.i18nModel.getText("loginTimeOut"));
                    return;
                  }
                  if (
                    oVM.getProperty("/userId") === userData.EmployeeID &&
                    oVM.getProperty("/userName") === userData.EmployeeName
                  ) {
                    // Save to LoginModel 
                    oLoginModel.setProperty("/EmployeeID", userData.EmployeeID);
                    oLoginModel.setProperty("/EmployeeName", userData.EmployeeName);
                    oLoginModel.setProperty("/EmailID", userData.EmailID);
                    oLoginModel.setProperty("/Role", userData.Role);
                    oLoginModel.setProperty("/FolderID", response.FolderID);
                    oLoginModel.setProperty("/EducationalandDocumentsDetailFolderID", userData.EducationalandDocumentsDetailFolderID);
                    oLoginModel.setProperty("/EmploymentDetailFolderID", userData.EmploymentDetailFolderID);
                    oLoginModel.setProperty("/", userData.EmployeeID);
                    // Reset LoginViewModel
                    oVM.setProperty("/userId", ""); oVM.setProperty("/userName", ""); oVM.setProperty("/otp", ""); oVM.setProperty("/password", ""); oVM.setProperty("/isOtpVisible", false); oVM.setProperty("/isPasswordVisible", false); oVM.setProperty("/isSendOtpVisible", false); oVM.setProperty("/sendOtpText", this.i18nModel.getText("sendOtp")); oVM.setProperty("/isOtpSelected", false); oVM.setProperty("/isPasswordSelected", false); oVM.setProperty("/isForgotPasswordVisible", false);
                    // Navigate
                    this.getRouter().navTo("RouteTilePage");
                  } else {
                    MessageToast.show(this.i18nModel.getText("errorMsguser"));
                  }

                } else {
                  const backendMsg = response?.message || this.i18nModel.getText("loginFailed");
                  MessageToast.show(backendMsg);
                }
              }).catch((error) => {
                const errorMsg = error?.responseText
                  ? JSON.parse(error.responseText).message
                  : this.i18nModel.getText("loginFailed");
                MessageToast.show(errorMsg);
              });
          } catch (e) {
            MessageToast.show(this.i18nModel.getText("loginFailed"));
          }
        },
        onLoginOptionChange: function (oEvent) {
          const oVM = this.getView().getModel("LoginViewModel");
          if (oEvent.getSource().getId().includes("PasswordRadio")) {
            // User selected password login
            oVM.setProperty("/isPasswordVisible", true); oVM.setProperty("/isForgotPasswordVisible", true); oVM.setProperty("/isOtpVisible", false); oVM.setProperty("/isSendOtpVisible", false); oVM.setProperty("/isPasswordSelected", true); oVM.setProperty("/isOtpSelected", false);
          } else {
            // User selected OTP login
            oVM.setProperty("/userIdValueState", "None"); oVM.setProperty("/userNameValueState", "None"); oVM.setProperty("/password", ""); oVM.setProperty("/passwordValueState", "None"); oVM.setProperty("/isPasswordVisible", false); oVM.setProperty("/isForgotPasswordVisible", false); oVM.setProperty("/isSendOtpVisible", true); oVM.setProperty("/isOtpVisible", false); oVM.setProperty("/isPasswordSelected", false); oVM.setProperty("/isOtpSelected", true);
          }
        },
        //Password login change event
        LP_onpasswordchange: function () {
          this.LP_onLogin();
        },
        // //OTP login change event
        LP_onOTPchange: function () {
          this.LP_onLogin();
        },
        LP_onForgotPassword: function () {
          const oVM = this.getView().getModel("LoginViewModel");
          const resetFields = () => {
            sap.ui.getCore().byId("FSM_id_userIdInput").setEditable(true);
            sap.ui.getCore().byId("FSM_id_userNameInput").setEditable(true);
            sap.ui.getCore().byId("FSM_id_otpInput").setEditable(true); oVM.setProperty("/userId", ""); oVM.setProperty("/userIdValueState", "None"); oVM.setProperty("/userName", ""); oVM.setProperty("/userNameValueState", "None"); oVM.setProperty("/password", ""); oVM.setProperty("/passwordValueState", "None");
            // Disable save button in fragment
            sap.ui.getCore().byId("FSM_id_SaveBTN").setEnabled(true);;
          };
          if (!this.oPassforgot) {
            sap.ui.core.Fragment.load({
              name: "sap.kt.com.minihrsolution.fragment.Sendmail",
              controller: this,
            }).then((oPassforgot) => {
              this.oPassforgot = oPassforgot;
              this.getView().addDependent(this.oPassforgot);
              this.oPassforgot.open();
              //resetFields();
            });
          } else {
            this.oPassforgot.open();
            resetFields();
          }
        },
        // Close the dialog when the cancel button is pressed
        SM_onPressCancle: function () {
          const oFragModel = this.getView().getModel("LoginViewModel");
          // Reset all values and value states in the model
          oFragModel.setProperty("/frgUserId", ""); oFragModel.setProperty("/frgUserIdValueState", "None"); oFragModel.setProperty("/frgUserName", ""); oFragModel.setProperty("/frgUserNameValueState", "None"); oFragModel.setProperty("/frgOtp", ""); oFragModel.setProperty("/frgOtpValueState", "None"); oFragModel.setProperty("/frgOtpVisible", false); oFragModel.setProperty("/frgNewPassword", ""); oFragModel.setProperty("/frgNewPasswordValueState", "None");
          oFragModel.setProperty("/frgNewPasswordVisible", false);
          oFragModel.setProperty("/frgConfirmPassword", ""); oFragModel.setProperty("/frgConfirmPasswordValueState", "None"); oFragModel.setProperty("/frgConfirmPasswordVisible", false);
          // Close the dialog
          if (this.oPassforgot) {
            this.oPassforgot.close();
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
        FSM_username: function (oEvent) {
          utils._LCvalidateName(oEvent);
        },
        FSM_userID: function (oEvent) {
          utils._LCvalidateMandatoryField(oEvent);
        },

        SM_onPressSave: function () {
          const oFragModel = this.getView().getModel("LoginViewModel");
          // Send OTP
          if (!oFragModel.getProperty("/frgOtpVisible")) {
            if (
              !utils._LCvalidateMandatoryField(sap.ui.getCore().byId("FSM_id_userIdInput"), "ID") ||
              !utils._LCvalidateName(sap.ui.getCore().byId("FSM_id_userNameInput"), "ID")
            ) {
              MessageToast.show(this.i18nModel.getText("validateUser"));
              return;
            }
            try {
              this.ajaxCreateWithJQuery("SendOTP", {
                EmployeeID: oFragModel.getProperty("/frgUserId"),
                EmployeeName: oFragModel.getProperty("/frgUserName"),
                Type: "OTP"
              })
                .then((response) => {
                  if (response.success === true) {
                    MessageToast.show(this.i18nModel.getText("sentOTP"));
                    oFragModel.setProperty("/frgOtpVisible", true);
                    oFragModel.setProperty("/frgOtp", "");
                  } else {
                    MessageToast.show(this.i18nModel.getText("errorMsguser"));
                  }
                })
                .catch(() => {
                  MessageToast.show(this.i18nModel.getText("errorMsguser"));
                });
            } catch (error) {
              MessageToast.show(this.i18nModel.getText("errorMsguser"));
            }
            return;
          }
          // Verify OTP
          if (oFragModel.getProperty("/frgOtpVisible") && !oFragModel.getProperty("/frgOtpVerified")) {
            if (!oFragModel.getProperty("/frgOtp")) {
              MessageToast.show(this.i18nModel.getText("rqForotp"));
              return;
            }
            try {
              this.ajaxReadWithJQuery("LoginDetails", {
                EmployeeID: oFragModel.getProperty("/frgUserId"),
                EmployeeName: oFragModel.getProperty("/frgUserName"),
                OTP: oFragModel.getProperty("/frgOtp")
              })
                .then((response) => {
                  if (response.success === true) {
                    MessageToast.show(this.i18nModel.getText("verifiedOTP"));

                    sap.ui.getCore().byId("FSM_id_userIdInput").setEditable(false); sap.ui.getCore().byId("FSM_id_userNameInput").setEditable(false);
                    sap.ui.getCore().byId("FSM_id_otpInput").setEditable(false); oFragModel.setProperty("/frgOtpVerified", true); oFragModel.setProperty("/frgNewPasswordVisible", true); oFragModel.setProperty("/frgConfirmPasswordVisible", true); oFragModel.setProperty("/frgNewPassword", ""); oFragModel.setProperty("/frgConfirmPassword", "");
                  } else {
                    MessageToast.show(this.i18nModel.getText("invalidOTP"));
                  }
                })
                .catch(() => {
                  MessageToast.show(this.i18nModel.getText("invalidOTP"));
                });
            } catch (error) {
              MessageToast.show(this.i18nModel.getText("invalidOTP"));
            }
            return;
          }
          // Set New Password
          if (oFragModel.getProperty("/frgOtpVerified")) {
            const oNewPwInput = sap.ui.getCore().byId("FSM_id_newPasswordInput");
            const oConfirmPwInput = sap.ui.getCore().byId("FSM_id_confirmPasswordInput");

            if (
              !utils._LCvalidatePassword(oNewPwInput, "ID") ||
              !utils._LCvalidatePassword(oConfirmPwInput, "ID")
            ) {
              MessageToast.show(this.i18nModel.getText("mandetoryFields"));
              return;
            }

            if (oFragModel.getProperty("/frgNewPassword") !== oFragModel.getProperty("/frgConfirmPassword")) {
              MessageToast.show(this.i18nModel.getText("misPasswords"));
              return;
            }
            try {
              this.ajaxUpdateWithJQuery("LoginDetails", {
                data: {
                  Password: oFragModel.getProperty("/frgNewPassword"),
                },
                filters: {
                  EmployeeID: oFragModel.getProperty("/frgUserId")
                }
              }).then((response) => {
                if (response.success === true) {
                  MessageToast.show(this.i18nModel.getText("updatepassword"));
                  // Reset form state
                  sap.ui.getCore().byId("FSM_id_userIdInput").setEditable(true);
                  sap.ui.getCore().byId("FSM_id_userNameInput").setEditable(true);
                  sap.ui.getCore().byId("FSM_id_otpInput").setEditable(true); oFragModel.setProperty("/frgUserId", ""); oFragModel.setProperty("/frgUserName", ""); oFragModel.setProperty("/frgOtp", ""); oFragModel.setProperty("/frgOtpVisible", false); oFragModel.setProperty("/frgOtpVerified", false); oFragModel.setProperty("/frgNewPassword", ""); oFragModel.setProperty("/frgConfirmPassword", ""); oFragModel.setProperty("/frgNewPasswordVisible", false); oFragModel.setProperty("/frgConfirmPasswordVisible", false);
                  if (this.oPassforgot) {
                    this.oPassforgot.close();
                  }
                } else {
                  MessageToast.show("An error occurred: " + response.message);
                }
              })
                .catch(() => {
                  MessageToast.show(this.i18nModel.getText("loginFailed"));
                });
            } catch (error) {
              MessageToast.show(this.i18nModel.getText("loginFailed"));
            }
          }
        }
      }
    );
  }
);
