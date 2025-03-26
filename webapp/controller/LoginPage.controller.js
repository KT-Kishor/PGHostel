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
        _onRouteMatched: function () {
          var oView = this.getView();
          this.API = "https://www.rest.kalpavrikshatechnologies.com";
          this.i18nModel = this.getView().getModel("i18n").getResourceBundle();
          oView.byId("Lp_id_PasswordRadio").setSelected(true);
          oView.byId("Lp_id_PasswordLabel").setVisible(true);
          oView.byId("Lp_id_PasswordInput").setVisible(true);
          oView.byId("Lp_id_ForgotPasswordLink").setVisible(true);
          oView.byId("Lp_id_ForgotPasswordLink").setValue("");
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
          var oView = this.getView();
          var that = this;
          var userId = oView.byId("Lp_id_Userid").getValue().trim();
          var userName = oView.byId("Lp_id_Username").getValue().trim();
          var oOtpInput = oView.byId("Lp_id_CaptchaInput");
          var oOtpLabel = oView.byId("Lp_id_OtpLabel");
          var oOtpButton = oView.byId("idbtnsendotp");

          if (
            utils._LCvalidateMandatoryField(this.byId("Lp_id_Userid"), "ID") &&
            utils._LCvalidateName(this.byId("Lp_id_Username"), "ID")
          ) {
          } else {
            MessageToast.show(that.i18nModel.getText("validateUser"));
            return;
          }

          $.ajax({
            url: this.API + "/SendOTP",
            type: "POST",
            contentType: "application/json",
            headers: {
              name: "$2a$12$LC.eHGIEwcbEWhpi9gEA.umh8Psgnlva2aGfFlZLuMtPFjrMDwSui",
              password:
                "$2a$12$By8zKifvRcfxTbabZJ5ssOsheOLdAxA2p6/pdaNvv1xy1aHucPm0u",
            },
            data: JSON.stringify({
              // Converted data to JSON string
              EmployeeID: userId,
              EmployeeName: userName,
              Type: "OTP",
            }),
            success: function (response) {
              oOtpInput.setVisible(true);
              oOtpLabel.setVisible(true);
              oOtpButton.setText("Resend OTP");
              MessageToast.show(that.i18nModel.getText("sentOTP"));
            },
            error: function (xhr, status, error) {
              MessageToast.show(that.i18nModel.getText("errorMsguser"));
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

          // Check if OTP login is selected and OTP is empty
          if (isOtpLogin && userOtp === "") {
            MessageToast.show(that.i18nModel.getText("checkOTP"));
            return;
          }

          // Validate mandatory fields (excluding password when OTP login is selected)
          if (
            utils._LCvalidateMandatoryField(this.byId("Lp_id_Userid"), "ID") &&
            utils._LCvalidateName(this.byId("Lp_id_Username"), "ID") &&
            (!isPasswordLogin ||
              utils._LCvalidateMandatoryField(
                this.byId("Lp_id_PasswordInput"),
                "ID"
              )) // Skip password validation if OTP login is selected
          ) {
            var queryString = $.param({
              EmployeeID: userId,
              EmployeeName: userName,
              OTP: isOtpLogin ? userOtp : "",
              Password: isPasswordLogin ? password : "",
            });

            $.ajax({
              url: this.API + "/LoginDetails?" + queryString,
              type: "GET",
              contentType: "application/json",
              headers: {
                name: "$2a$12$LC.eHGIEwcbEWhpi9gEA.umh8Psgnlva2aGfFlZLuMtPFjrMDwSui",
                password:
                  "$2a$12$By8zKifvRcfxTbabZJ5ssOsheOLdAxA2p6/pdaNvv1xy1aHucPm0u",
              },
              success: function (response) {
                MessageToast.show(that.i18nModel.getText("logsuccess"));
                that.getRouter().navTo("RouteTilePage");

                // Clear all input fields after successful login
                oView.byId("Lp_id_Userid").setValue("");
                oView.byId("Lp_id_Username").setValue("");
                oView.byId("Lp_id_CaptchaInput").setValue("").setVisible(false);
                oView
                  .byId("Lp_id_PasswordInput")
                  .setValue("")
                  .setVisible(false);
                oView
                  .byId("idbtnsendotp")
                  .setText("Send OTP")
                  .setVisible(false);

                // Hide Password and OTP Fields
                oView.byId("Lp_id_OtpLabel").setVisible(false);
                oView.byId("Lp_id_PasswordLabel").setVisible(false);
                oView.byId("Lp_id_ForgotPasswordLink").setVisible(false);

                oView.byId("Lp_id_OtpRadio").setSelected(false);
                oView.byId("Lp_id_PasswordRadio").setSelected(false);
              },
              error: function (error) {
                MessageToast.show(JSON.parse(error.responseText).message);
              },
            });
          } else {
            MessageToast.show(that.i18nModel.getText("mandetoryFields"));
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
          var that = this;
          var oView = this.getView();
          var userId = oView.byId("Lp_id_Userid").getValue().trim();
          var userName = oView.byId("Lp_id_Username").getValue().trim();
          var userOtp = oView.byId("Lp_id_CaptchaInput").getValue().trim();
          var password = oView.byId("Lp_id_PasswordInput").getValue().trim();
          var isOtpLogin = oView.byId("Lp_id_OtpRadio").getSelected();
          var isPasswordLogin = oView.byId("Lp_id_PasswordRadio").getSelected();

          // Check if OTP login is selected and OTP is empty
          if (isOtpLogin && userOtp === "") {
            MessageToast.show(that.i18nModel.getText("checkOTP"));
            return;
          }

          // Validate mandatory fields (excluding password when OTP login is selected)
          if (
            utils._LCvalidateMandatoryField(this.byId("Lp_id_Userid"), "ID") &&
            utils._LCvalidateName(this.byId("Lp_id_Username"), "ID") &&
            (!isPasswordLogin ||
              utils._LCvalidateMandatoryField(
                this.byId("Lp_id_PasswordInput"),
                "ID"
              )) // Skip password validation if OTP login is selected
          ) {
            var queryString = $.param({
              EmployeeID: userId,
              EmployeeName: userName,
              OTP: isOtpLogin ? userOtp : "",
              Password: isPasswordLogin ? password : "",
            });

            $.ajax({
              url: this.API + "/LoginDetails?" + queryString,
              type: "GET",
              contentType: "application/json",
              headers: {
                name: "$2a$12$LC.eHGIEwcbEWhpi9gEA.umh8Psgnlva2aGfFlZLuMtPFjrMDwSui",
                password:
                  "$2a$12$By8zKifvRcfxTbabZJ5ssOsheOLdAxA2p6/pdaNvv1xy1aHucPm0u",
              },
              success: function (response) {
                MessageToast.show(that.i18nModel.getText("logsuccess"));
                that.getRouter().navTo("RouteTilePage");

                // Clear all input fields after successful login
                oView.byId("Lp_id_Userid").setValue("");
                oView.byId("Lp_id_Username").setValue("");
                oView.byId("Lp_id_CaptchaInput").setValue("").setVisible(false);
                oView
                  .byId("Lp_id_PasswordInput")
                  .setValue("")
                  .setVisible(false);
                oView
                  .byId("idbtnsendotp")
                  .setText("Send OTP")
                  .setVisible(false);

                // Hide Password and OTP Fields
                oView.byId("Lp_id_OtpLabel").setVisible(false);
                oView.byId("Lp_id_PasswordLabel").setVisible(false);
                oView.byId("Lp_id_ForgotPasswordLink").setVisible(false);

                oView.byId("Lp_id_OtpRadio").setSelected(false);
                oView.byId("Lp_id_PasswordRadio").setSelected(false);
              },
              error: function (error) {
                MessageToast.show(JSON.parse(error.responseText).message);
              },
            });
          } else {
            MessageToast.show(that.i18nModel.getText("mandetoryFields"));
          }
        },
        //OTP login change event
        LP_onOTPchange: function () {
          var that = this;
          var oView = this.getView();
          var userId = oView.byId("Lp_id_Userid").getValue().trim();
          var userName = oView.byId("Lp_id_Username").getValue().trim();
          var userOtp = oView.byId("Lp_id_CaptchaInput").getValue().trim();
          var password = oView.byId("Lp_id_PasswordInput").getValue().trim();
          var isOtpLogin = oView.byId("Lp_id_OtpRadio").getSelected();
          var isPasswordLogin = oView.byId("Lp_id_PasswordRadio").getSelected();

          // Check if OTP login is selected and OTP is empty
          if (isOtpLogin && userOtp === "") {
            MessageToast.show(that.i18nModel.getText("checkOTP"));
            return;
          }

          // Validate mandatory fields (excluding password when OTP login is selected)
          if (
            utils._LCvalidateMandatoryField(this.byId("Lp_id_Userid"), "ID") &&
            utils._LCvalidateName(this.byId("Lp_id_Username"), "ID") &&
            (!isPasswordLogin ||
              utils._LCvalidateMandatoryField(
                this.byId("Lp_id_PasswordInput"),
                "ID"
              )) // Skip password validation if OTP login is selected
          ) {
            var queryString = $.param({
              EmployeeID: userId,
              EmployeeName: userName,
              OTP: isOtpLogin ? userOtp : "",
              Password: isPasswordLogin ? password : "",
            });

            $.ajax({
              url: this.API + "/LoginDetails?" + queryString,
              type: "GET",
              contentType: "application/json",
              headers: {
                name: "$2a$12$LC.eHGIEwcbEWhpi9gEA.umh8Psgnlva2aGfFlZLuMtPFjrMDwSui",
                password:
                  "$2a$12$By8zKifvRcfxTbabZJ5ssOsheOLdAxA2p6/pdaNvv1xy1aHucPm0u",
              },
              success: function (response) {
                MessageToast.show(that.i18nModel.getText("logsuccess"));
                that.getRouter().navTo("RouteTilePage");

                // Clear all input fields after successful login
                oView.byId("Lp_id_Userid").setValue("");
                oView.byId("Lp_id_Username").setValue("");
                oView.byId("Lp_id_CaptchaInput").setValue("").setVisible(false);
                oView
                  .byId("Lp_id_PasswordInput")
                  .setValue("")
                  .setVisible(false);
                oView
                  .byId("idbtnsendotp")
                  .setText("Send OTP")
                  .setVisible(false);

                // Hide Password and OTP Fields
                oView.byId("Lp_id_OtpLabel").setVisible(false);
                oView.byId("Lp_id_PasswordLabel").setVisible(false);
                oView.byId("Lp_id_ForgotPasswordLink").setVisible(false);

                oView.byId("Lp_id_OtpRadio").setSelected(false);
                oView.byId("Lp_id_PasswordRadio").setSelected(false);
              },
              error: function (error) {
                MessageToast.show(JSON.parse(error.responseText).message);
              },
            });
          } else {
            MessageToast.show(that.i18nModel.getText("mandetoryFields"));
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
                oView.byId("Lp_id_Userid").setValue("").setValueState("None");
                oView.byId("Lp_id_Username").setValue("").setValueState("None");
                oView
                  .byId("Lp_id_PasswordInput")
                  .setValue("")
                  .setValueState("None");
              }.bind(this)
            );
          } else {
            this.oDialog.open();
            sap.ui.getCore().byId("FSM_id_SaveBTN").setEnabled(false);
            oView.byId("Lp_id_Userid").setValue("").setValueState("None");
            oView.byId("Lp_id_Username").setValue("").setValueState("None");
          }
        },
        SM_onPressCancle: function () {
          var oUserIdInput = sap.ui.getCore().byId("FSM_id_userIdInput");
          var oUserNameInput = sap.ui.getCore().byId("FSM_id_userNameInput");
          var otpInput = sap.ui.getCore().byId("FSM_id_otpInput");
          var oNewPwInput = sap.ui.getCore().byId("FSM_id_newPasswordInput");
          var oConfirmPwInput = sap.ui
            .getCore()
            .byId("FSM_id_confirmPasswordInput");

          // Reset values
          oUserIdInput.setValue("");
          oUserNameInput.setValue("");
          otpInput.setValue("");
          oNewPwInput.setValue("");
          oConfirmPwInput.setValue("");

          // Reset value states
          oUserIdInput.setValueState("None");
          oUserNameInput.setValueState("None");
          otpInput.setValueState("None");
          oNewPwInput.setValueState("None");
          oConfirmPwInput.setValueState("None");

          // Hide OTP, new password, and confirm password fields
          otpInput.setVisible(false);
          oNewPwInput.setVisible(false);
          oConfirmPwInput.setVisible(false);

          this.oDialog.close();
        },

        SM_onChangeSendOTP: function () {
          var that = this;
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
            MessageToast.show(that.i18nModel.getText("validateUser"));
            return;
          }

          $.ajax({
            url: this.API + "/SendOTP",
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
              MessageToast.show(that.i18nModel.getText("sentOTP"));
              // Show only the OTP input field and its label
              otplabel.setVisible(true);
              otpInput.setVisible(true);

              // Hide other fields
              newpasslabel.setVisible(false);
              confirmpasslabel.setVisible(false);
              newpassinput.setVisible(false);
              conpassinput.setVisible(false);

              otpInput.setValue("");
            },
            error: function (xhr, status, error) {
              MessageToast.show(that.i18nModel.getText("errorMsguser"));
            },
          });
        },

        SM_onChangeOTP: function () {
          var that = this;
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
            MessageToast.show(that.i18nModel.getText("rqForotp"));
            return;
          }
          var queryString = $.param({
            EmployeeID: frgUserId,
            EmployeeName: frgUserName,
            OTP: otpValue,
          });

          $.ajax({
            url: this.API + "/LoginDetails?" + queryString,
            type: "GET",
            contentType: "application/json",
            headers: {
              name: "$2a$12$LC.eHGIEwcbEWhpi9gEA.umh8Psgnlva2aGfFlZLuMtPFjrMDwSui",
              password:
                "$2a$12$By8zKifvRcfxTbabZJ5ssOsheOLdAxA2p6/pdaNvv1xy1aHucPm0u",
            },

            success: function (response) {
              sap.ui.getCore().byId("FSM_id_SaveBTN").setEnabled(true);
              MessageToast.show(that.i18nModel.getText("verifiedOTP"));

              newpasslabel.setVisible(true);
              newpassinput.setVisible(true);
              confirmpasslabel.setVisible(true);
              conpassinput.setVisible(true);
            },
            error: function (xhr, status, error) {
              MessageToast.show(that.i18nModel.getText("invalidOTP"));
            },
          });
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
        LP_onTogglePasswordVisibility: function (oEvent) {
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
          var that = this;
          var oUserIdInput = sap.ui.getCore().byId("FSM_id_userIdInput");
          var oUserNameInput = sap.ui.getCore().byId("FSM_id_userNameInput");
          var oOtpInput = sap.ui.getCore().byId("FSM_id_otpInput");
          var oNewPwInput = sap.ui.getCore().byId("FSM_id_newPasswordInput");
          var oConfirmPwInput = sap.ui
            .getCore()
            .byId("FSM_id_confirmPasswordInput");

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
            MessageToast.show(that.i18nModel.getText("mandetoryFields"));
            return; // Stops execution if validation fails
          }
          if (newPassword !== confirmPassword) {
            MessageToast.show(that.i18nModel.getText("misPasswords"));
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
            url: this.API + "/LoginDetails",
            type: "PUT",
            contentType: "application/json",
            data: JSON.stringify(requestData), // Send data in the request body
            headers: {
              name: "$2a$12$LC.eHGIEwcbEWhpi9gEA.umh8Psgnlva2aGfFlZLuMtPFjrMDwSui",
              password:
                "$2a$12$By8zKifvRcfxTbabZJ5ssOsheOLdAxA2p6/pdaNvv1xy1aHucPm0u",
            },
            success: function (response) {
              // Clear input values
              oUserIdInput.setValue("");
              oUserNameInput.setValue("");
              oOtpInput.setValue("").setVisible(false);
              oNewPwInput.setValue("").setVisible(false);
              oConfirmPwInput.setValue("").setVisible(false);
              // Close dialog if it exists
              if (this.oDialog) {
                this.oDialog.close();
              }

              MessageToast.show(that.i18nModel.getText("updatepassword"));
            }.bind(this),
            error: function (err) {
              MessageToast.show("An error occurred: " + err.responseText);
            }.bind(this),
          });
        },
      }
    );
  }
);
