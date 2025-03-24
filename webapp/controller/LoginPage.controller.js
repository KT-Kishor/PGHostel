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

        LP_onOtppress: function () {
          var oView = this.getView();
          var userId = oView.byId("Lp_id_Userid").getValue().trim();
          var userName = oView.byId("Lp_id_Username").getValue().trim();
          var oOtpInput = oView.byId("Lp_id_CaptchaInput");
          var oOtpLabel = oView.byId("Lp_id_OtpLabel");
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
            },
            error: function (xhr, status, error) {
              MessageToast.show("Error verifying user. Please try again.");
            },
          });
        },

        LP_onLogin: function () {
          var that = this;
          var oView = this.getView();

          var userId = oView.byId("Lp_id_Userid").getValue().trim();
          var userName = oView.byId("Lp_id_Username").getValue().trim();
          var userOtp = oView.byId("Lp_id_CaptchaInput").getValue().trim();
          var password = oView.byId("Lp_id_PasswordInput").getValue().trim();

          var isOtpLogin = oView.byId("Lp_id_OtpRadio").getSelected();
          var isPasswordLogin = oView.byId("Lp_id_PasswordRadio").getSelected();

          // Validation for mandatory fields
          if (!userId || !userName) {
            MessageToast.show("Please enter User ID and Username.");
            return;
          }

          var queryString = $.param({
            EmployeeID: userId,
            EmployeeName: userName,
            OTP: isOtpLogin ? userOtp : "",
            Password: isPasswordLogin ? password : "",
          });

          $.ajax({
            url:
              "https://www.rest.kalpavrikshatechnologies.com/LoginDetails?" +
              queryString,
            type: "GET",
            contentType: "application/json",
            headers: {
              name: "$2a$12$LC.eHGIEwcbEWhpi9gEA.umh8Psgnlva2aGfFlZLuMtPFjrMDwSui",
              password:
                "$2a$12$By8zKifvRcfxTbabZJ5ssOsheOLdAxA2p6/pdaNvv1xy1aHucPm0u",
            },
            success: function (response) {
              MessageToast.show("Login Successful");
              that.getRouter().navTo("RouteTilePage");

              // Clear all input fields after successful login
              oView.byId("Lp_id_Userid").setValue("");
              oView.byId("Lp_id_Username").setValue("");
              oView.byId("Lp_id_CaptchaInput").setValue("");
              oView.byId("Lp_id_PasswordInput").setValue("");

              oView.byId("idbtnsendotp").setText("Send OTP");
            },
            error: function () {
              MessageToast.show("Error. Please try again.");
            },
          });
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
            // oOtpInput.setVisible(true);
            // oOtpLabel.setVisible(true);
            oSendotp.setVisible(true);

            // Hide password field and forgot password link
            oPasswordInput.setVisible(false);
            oPasswordLabel.setVisible(false);
            oForgotPasswordLink.setVisible(false);
          }
        },

        LP_onForgotPassword: function () {
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
                sap.ui.getCore().byId("FSM_id_SaveBTN").setEnabled(false);
                this.modelFunction();
                sap.ui
                  .getCore()
                  .byId("FSM_id_newPasswordInput")
                  .setValueState("None");
                sap.ui
                  .getCore()
                  .byId("FSM_id_confirmPasswordInput")
                  .setValueState("None");
              }.bind(this)
            );
          } else {
            this.oDialog.open();
            sap.ui.getCore().byId("FSM_id_SaveBTN").setEnabled(false);
            this.modelFunction();
            sap.ui
              .getCore()
              .byId("FSM_id_newPasswordInput")
              .setValueState("None");
            sap.ui
              .getCore()
              .byId("FSM_id_confirmPasswordInput")
              .setValueState("None");
          }
        },
        SM_onPressCancle: function () {
          this.oDialog.close();
        },

        SM_onChangeSendOTP: function () {
          var userfrgId = sap.ui
            .getCore()
            .byId("FSM_id_userIdInput")
            .getValue()
            .trim();
          var userfrgName = sap.ui
            .getCore()
            .byId("FSM_id_userNameInput")
            .getValue()
            .trim();

          var otplabel = sap.ui.getCore().byId("FSM_id_frgotp");
          var otpInput = sap.ui.getCore().byId("FSM_id_otpInput");
          var newpasslabel = sap.ui.getCore().byId("FSM_id_frgnewpass");
          var newpassinput = sap.ui.getCore().byId("FSM_id_newPasswordInput");
          var confirmpasslabel = sap.ui.getCore().byId("FSM_id_frgconpass");
          var conpassinput = sap.ui
            .getCore()
            .byId("FSM_id_confirmPasswordInput");

          if (!userfrgId || !userfrgName) {
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
              EmployeeID: userfrgId,
              EmployeeName: userfrgName,
              Type: "OTP",
            }),
            success: function (response) {
              MessageToast.show(
                "OTP sent to your registered email address. Please enter the OTP to proceed."
              );

              // Show only the OTP input field and its label
              otplabel.setVisible(true);
              otpInput.setVisible(true);

              // Hide other fields
              newpasslabel.setVisible(false);
              confirmpasslabel.setVisible(false);
              newpassinput.setVisible(false);
              conpassinput.setVisible(false);
            },
            error: function (xhr, status, error) {
              MessageToast.show("Error verifying user. Please try again.");
            },
          });
        },

        SM_onChangeOTP: function () {
          var frgUserId = sap.ui
            .getCore()
            .byId("FSM_id_userIdInput")
            .getValue()
            .trim();
          var frgUserName = sap.ui
            .getCore()
            .byId("FSM_id_userNameInput")
            .getValue()
            .trim();
          var otpValue = sap.ui
            .getCore()
            .byId("FSM_id_otpInput")
            .getValue()
            .trim();
          var newpasslabel = sap.ui.getCore().byId("FSM_id_frgnewpass");
          var newpassinput = sap.ui.getCore().byId("FSM_id_newPasswordInput");
          var confirmpasslabel = sap.ui.getCore().byId("FSM_id_frgconpass");
          var conpassinput = sap.ui
            .getCore()
            .byId("FSM_id_confirmPasswordInput");

          if (!otpValue) {
            MessageToast.show("Please enter the OTP.");
            return;
          }
          var queryString = $.param({
            EmployeeID: frgUserId,
            EmployeeName: frgUserName,
            OTP: otpValue,
          });

          $.ajax({
            url:
              "https://www.rest.kalpavrikshatechnologies.com/LoginDetails?" +
              queryString,
            type: "GET",
            contentType: "application/json",
            headers: {
              name: "$2a$12$LC.eHGIEwcbEWhpi9gEA.umh8Psgnlva2aGfFlZLuMtPFjrMDwSui",
              password:
                "$2a$12$By8zKifvRcfxTbabZJ5ssOsheOLdAxA2p6/pdaNvv1xy1aHucPm0u",
            },

            success: function (response) {
              sap.ui.getCore().byId("FSM_id_SaveBTN").setEnabled(true);
              MessageToast.show(
                "OTP verified successfully. Please enter a new password."
              );
              newpasslabel.setVisible(true);
              newpassinput.setVisible(true);
              confirmpasslabel.setVisible(true);
              conpassinput.setVisible(true);
            },
            error: function (xhr, status, error) {
              MessageToast.show("Error verifying OTP. Please try again.");
            },
          });
        },
        SM_onChnageSetAndConfirm: function () {
          var oNewPassword = sap.ui.getCore().byId("FSM_id_newPasswordInput");
          var oConfirmPassword = sap.ui
            .getCore()
            .byId("FSM_id_confirmPasswordInput");
          var sNewPassword = oNewPassword.getValue();
          var sConfirmPassword = oConfirmPassword.getValue();
          var passwordPattern = /^(?=.*[A-Z])(?=.*[\W_]).{6,}$/;

          if (!passwordPattern.test(sNewPassword)) {
            this.NewPassword = false;
            oNewPassword.setValueState("Error");
            oNewPassword.setValueStateText(
              "Password must be atleast 6 characters long, contains one uppercase letter and one special character"
            );
          } else {
            oNewPassword.setValueState("None");
            this.NewPassword = true;
          }

          if (sConfirmPassword && sNewPassword !== sConfirmPassword) {
            oConfirmPassword.setValueState("Error");
            oConfirmPassword.setValueStateText("Password mismatch");
            this.ConfirmPassword = false;
          } else {
            oConfirmPassword.setValueState("None");
            this.ConfirmPassword = true;
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
          var sCurrentValue = oInput.getValue(); // Get the current value before toggling
          oInput.setValue(sCurrentValue); // Set the value again to prevent it from being cleared
        },
        SM_onPressSave: function () {
          var frgUserId = sap.ui
            .getCore()
            .byId("FSM_id_userIdInput")
            .getValue()
            .trim();
          var newPassword = sap.ui
            .getCore()
            .byId("FSM_id_newPasswordInput")
            .getValue()
            .trim();
          var confirmPassword = sap.ui
            .getCore()
            .byId("FSM_id_confirmPasswordInput")
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
      }
    );
  }
);
