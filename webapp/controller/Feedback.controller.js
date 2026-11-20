sap.ui.define([
    "./BaseController",
    "sap/m/MessageBox",
    "sap/m/MessageToast",
    "../utils/validation"
], function (BaseController, MessageBox, MessageToast, utils) {
    "use strict";

    return BaseController.extend("sap.ui.com.project1.controller.Feedback", {
        onInit: function () {
            this.getOwnerComponent().getRouter().getRoute("RouteFeedback").attachMatched(this._onRouteMatched, this);
            this.initializeLoginModel();
            this.i18nModel = this.getOwnerComponent().getModel("i18n").getResourceBundle();

            this.getView().setModel(new sap.ui.model.json.JSONModel({
                showOTPField: false,
                isOtpEntered: false,
                canResendOTP: true,
                otpTimer: 0,
                otpButtonText: this.i18nModel.getText("feedbackSendOtp")
            }), "LoginViewModel");

            // Initialize feedback model once
            const oModel = new sap.ui.model.json.JSONModel({
                bookingId: "",
                customerId: "",
                customerName: "",
                customerEmail: "",
                BedType: "",
                branchCode: "",
                roomNo: "",
                ratings: {
                    overall: 0,
                    cleanliness: 0,
                    staff: 0,
                    amenities: 0,
                    value: 0
                },
                comments: "",
                recommend: null,
                visitAgain: null,
                submitted: false
            });

            this.getView().setModel(oModel, "feedbackData");
        },

        _onRouteMatched: async function (oEvent) {
            this.i18nModel = this.getOwnerComponent().getModel("i18n").getResourceBundle();

            let oArgs;
            if (oEvent && typeof oEvent.getParameter === "function") {
                oArgs = oEvent.getParameter("arguments") || {};
                this._pendingFeedbackArgs = oArgs;
            } else if (this._pendingFeedbackArgs) {
                oArgs = this._pendingFeedbackArgs;
            } else {
                return;
            }

            const encodedBookingID = oArgs.bookingId;
            if (!encodedBookingID) {
                return this._goToNotFound();
            }

            const base64Regex =
                /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/;

            if (!base64Regex.test(encodedBookingID)) {
                return this._goToNotFound();
            }

            let decodedBookingID;
            try {
                decodedBookingID = atob(encodedBookingID);
            } catch (e) {
                return this._goToNotFound();
            }

            if (btoa(decodedBookingID) !== encodedBookingID) {
                return this._goToNotFound();
            }

            this._resetAllData();
            this.getBusyDialog();

            try {
                // Validate + fetch booking in ONE call
                const booking = await this._validateAndFetchBooking(decodedBookingID);
                if (!booking) {
                    return this._goToNotFound();
                }

                this.sUserID = String(booking.UserID || "").trim();
                if (!this.sUserID) {
                    return this._goToNotFound();
                }

                if (!this._isFeedbackAccessAllowed()) {
                    this._sFeedbackEmail = await this._getFeedbackOwnerEmail(booking);
                    if (!this._sFeedbackEmail) {
                        return this._goToNotFound();
                    }

                    // Keep the current session until the booking owner completes OTP.
                    // The feedback form remains blocked while verification is pending.
                    this._bPendingFeedbackRoute = true;
                    this.getView().addStyleClass("blur-background");

                    MessageBox.information(
                        this.i18nModel.getText("feedbackVerifyOtpAccess"),
                        {
                            title: this.i18nModel.getText("verificationRequired"),
                            styleClass: "myUnifiedBtn",
                            actions: [MessageBox.Action.OK],
                            emphasizedAction: MessageBox.Action.OK,
                            onClose: this._openFeedbackOtpDialog.bind(this)
                        }
                    );
                    return;
                }

                const oModel = this.getView().getModel("feedbackData");
                oModel.setProperty("/bookingId", decodedBookingID);
                oModel.setProperty("/customerId", booking.CustomerID || "");
                oModel.setProperty("/roomNo", booking.RoomNo || "");
                oModel.setProperty("/branchCode", booking.BranchCode || "");
                oModel.setProperty("/BedType", booking.BedType || "");
                oModel.setProperty("/customerName", booking.CustomerName || "");
                oModel.setProperty("/customerEmail", booking.CustomerEmail || booking.EmailID || booking.Email || "");
                this._bPendingFeedbackRoute = false;
                this.getView().removeStyleClass("blur-background");

            } catch (e) {
                this._goToNotFound();
            } finally {
                this.closeBusyDialog();
            }
        },

        _validateAndFetchBooking: async function (sBookingID) {
            try {
                // Check if feedback already submitted
                const oFeedbackResp = await this.ajaxReadWithJQuery("HM_Feedback", {
                    BookingID: sBookingID
                });

                const aFeedback = oFeedbackResp?.commentData || [];
                if (
                    Array.isArray(aFeedback) &&
                    aFeedback.length > 0 &&
                    aFeedback[0].Status === "Submitted"
                ) {
                    return null;
                }

                // Fetch booking ONCE
                const oBookingResp = await this.ajaxReadWithJQuery("HM_Booking", {
                    BookingID: sBookingID
                });

                if (
                    !Array.isArray(oBookingResp?.commentData) ||
                    oBookingResp.commentData.length !== 1
                ) {
                    return null;
                }

                return oBookingResp.commentData[0]; //  return booking object

            } catch (err) {
                return null;
            }
        },

        _goToNotFound: function () {
            this.getOwnerComponent().getRouter().navTo("NotFound", {}, true);
        },

        _getFeedbackOwnerEmail: async function (oBooking) {
            const sFallbackEmail = String(
                oBooking.CustomerEmail || oBooking.EmailID || oBooking.Email || ""
            ).trim();

            try {
                const oResponse = await this.ajaxReadWithJQuery("HM_LoginReadCall", {
                    UserID: this.sUserID
                });
                const vData = oResponse?.data;
                const oUser = (Array.isArray(vData) ? vData[0] : vData) || {};
                return String(oUser.EmailID || oUser.Email || sFallbackEmail).trim();
            } catch (e) {
                return sFallbackEmail;
            }
        },

        _isFeedbackAccessAllowed: function () {
            if (!this.sUserID) {
                return false;
            }

            const bLoggedIn = localStorage.getItem("isLoggedIn") === "true";
            return bLoggedIn && this._getLoggedInUserID() === this.sUserID;
        },

        _getLoggedInUserID: function () {
            try {
                const sEncodedUserID = localStorage.getItem("_aB39X");
                return sEncodedUserID ? String(atob(sEncodedUserID)).trim() : "";
            } catch (e) {
                return "";
            }
        },

        _invalidateActiveLoginSession: function () {
            localStorage.removeItem("isLoggedIn");
            localStorage.removeItem("_x9A1p");
            localStorage.removeItem("_k7LmQ");
            localStorage.removeItem("_aB39X");
            localStorage.removeItem("_mN72P");

            const oUIModel = this.getOwnerComponent().getModel("UIModel");
            if (oUIModel) {
                oUIModel.setProperty("/isLoggedIn", false);
            }

            const oLoginModel = this.getOwnerComponent().getModel("LoginModel");
            if (oLoginModel) {
                [
                    "EmployeeID", "UserID", "Salutation", "EmployeeName", "UserName",
                    "EmailID", "Role", "Type", "BranchCode", "STDCode", "MobileNo",
                    "Gender", "Country", "State", "City", "Address", "DateofBirth",
                    "FileContent", "Photo"
                ].forEach(function (sProperty) {
                    oLoginModel.setProperty("/" + sProperty, "");
                });
                oLoginModel.setProperty("/isLoggedIn", false);
            }
        },

        _openFeedbackOtpDialog: function () {
            if (!this._oLoginAlertDialog) {
                this._oLoginAlertDialog = sap.ui.xmlfragment(
                    this.createId("LoginAlertDialog"),
                    "sap.ui.com.project1.fragment.AdminDetailsSignin",
                    this
                );
                this.getView().addDependent(this._oLoginAlertDialog);
            }

            this._oLoginAlertDialog.open();
        },

        _applyVerifiedUserLogin: async function (oUser) {
            const sUserID = String(oUser?.UserID || "").trim();
            const sUserName = String(oUser?.UserName || oUser?.CustomerName || oUser?.EmployeeName || "").trim();
            let sEncryptedUserID = oUser?._x9A1p || "";
            let sEncryptedUserName = oUser?._k7LmQ || "";

            if ((!sEncryptedUserID || !sEncryptedUserName) &&
                typeof dcodeIO !== "undefined" && dcodeIO.bcrypt) {
                sEncryptedUserID = sEncryptedUserID || dcodeIO.bcrypt.hashSync(sUserID, 10);
                sEncryptedUserName = sEncryptedUserName || dcodeIO.bcrypt.hashSync(sUserName, 10);
            }

            if (!sUserID || !sUserName || !sEncryptedUserID || !sEncryptedUserName) {
                throw new Error(this.i18nModel.getText("feedbackLoginSessionError"));
            }

            this.initializeLoginModel();
            this._invalidateActiveLoginSession();

            await new Promise(function (resolve) {
                setTimeout(resolve, 300);
            });

            localStorage.setItem("isLoggedIn", "true");
            localStorage.setItem("_x9A1p", sEncryptedUserID);
            localStorage.setItem("_k7LmQ", sEncryptedUserName);
            localStorage.setItem("_aB39X", btoa(sUserID));
            localStorage.setItem("_mN72P", btoa(sUserName));

            const oUIModel = this.getOwnerComponent().getModel("UIModel");
            if (oUIModel) {
                oUIModel.setProperty("/isLoggedIn", true);
            }

            const oLoginModel = this.getOwnerComponent().getModel("LoginModel") || new sap.ui.model.json.JSONModel({});
            this.getOwnerComponent().setModel(oLoginModel, "LoginModel");
            sap.ui.getCore().setModel(oLoginModel, "LoginModel");
            oLoginModel.setData(Object.assign({}, oLoginModel.getData() || {}, {
                isLoggedIn: true,
                EmployeeID: sUserID,
                UserID: sUserID,
                Salutation: oUser.Salutation || "",
                EmployeeName: sUserName,
                UserName: sUserName,
                EmailID: oUser.EmailID || oUser.Email || "",
                Role: oUser.Role || "",
                Type: oUser.Type || "",
                BranchCode: oUser.BranchCode || "",
                STDCode: oUser.STDCode || "",
                MobileNo: oUser.MobileNo || oUser.Mobile || "",
                Gender: oUser.Gender || "",
                Country: oUser.Country || "",
                State: oUser.State || "",
                City: oUser.City || "",
                Address: oUser.Address || ""
            }));
        },

        onEmailliveChange: function (oEvent) {
            utils._LCvalidateEmail(oEvent);
        },

        onLoginOtpLive: function (oEvent) {
            const oLoginViewModel = this.getView().getModel("LoginViewModel");
            const oInput = oEvent.getSource();
            let sValue = String(oEvent.getParameter("value") || "").replace(/\D/g, "");

            if (sValue.length > 6) {
                sValue = sValue.slice(0, 6);
            }

            oInput.setValue(sValue);
            oLoginViewModel.setProperty("/isOtpEntered", sValue.length === 6);

            if (!sValue) {
                oInput.setValueState("None");
            } else if (sValue.length !== 6) {
                oInput.setValueState("Error");
                oInput.setValueStateText(this.i18nModel.getText("entervaliddigitOTP"));
            } else {
                oInput.setValueState("None");
            }
        },

        onPressOTP: async function () {
            const oEmailInput = sap.ui.core.Fragment.byId(this.createId("LoginAlertDialog"), "emailInput");
            const sEmail = oEmailInput?.getValue()?.trim();

            if (!utils._LCvalidateEmail(oEmailInput, "ID")) {
                MessageToast.show(this.i18nModel.getText("MSenterValidEmail"));
                return;
            }

            if (!this._sFeedbackEmail || sEmail.toLowerCase() !== this._sFeedbackEmail.toLowerCase()) {
                oEmailInput.setValueState("Error");
                oEmailInput.setValueStateText(this.i18nModel.getText("enteredEmailNot"));
                MessageToast.show(this.i18nModel.getText("enteredEmailNot"));
                return;
            }

            oEmailInput.setValueState("None");
            this.getBusyDialog();

            try {
                const oResponse = await this.ajaxCreateWithJQuery("HostelSendOTP", {
                    EmailID: sEmail,
                    Type: "OTP"
                });

                if (oResponse?.success) {
                    MessageToast.show(oResponse.message || this.i18nModel.getText("oTPSentCheckyourEmail"));
                    this._oResetUser = { EmailID: sEmail };

                    const oOtpInput = sap.ui.core.Fragment.byId(this.createId("LoginAlertDialog"), "otpInput");
                    if (oOtpInput) {
                        oOtpInput.setValue("");
                        oOtpInput.setValueState("None");
                        oOtpInput.setValueStateText("");
                        oOtpInput.focus();
                    }

                    this._startOtpTimer();
                } else {
                    MessageToast.show(oResponse?.message || this.i18nModel.getText("usernotFoundUnabletoSendOTP"));
                }
            } catch (oError) {
                MessageToast.show(
                    oError?.responseJSON?.message || oError?.message || this.i18nModel.getText("forgotOtpSendFailed")
                );
            } finally {
                this.closeBusyDialog();
            }
        },

        _verifyOTPWithBackend: async function (sOtp) {
            try {
                const oResponse = await this.ajaxReadWithJQuery("HM_Login", {
                    EmailID: this._oResetUser?.EmailID,
                    OTP: sOtp.trim()
                });

                if (oResponse?.success === true) {
                    this._oVerifiedUser = oResponse?.data?.[0] || null;
                }

                return oResponse?.success === true;
            } catch (e) {
                return false;
            }
        },

        onSignIn: async function () {
            const oDialog = this._oLoginAlertDialog;
            const oEmailInput = sap.ui.core.Fragment.byId(this.createId("LoginAlertDialog"), "emailInput");
            const oOtpInput = sap.ui.core.Fragment.byId(this.createId("LoginAlertDialog"), "otpInput");
            const sEmail = oEmailInput?.getValue()?.trim();
            const sOtp = oOtpInput?.getValue()?.trim();

            if (!utils._LCvalidateEmail(oEmailInput, "ID")) {
                MessageToast.show(this.i18nModel.getText("MSenterValidEmail"));
                return;
            }

            if (!this._sFeedbackEmail || sEmail.toLowerCase() !== this._sFeedbackEmail.toLowerCase()) {
                oEmailInput.setValueState("Error");
                oEmailInput.setValueStateText(this.i18nModel.getText("enteredEmailNot"));
                MessageToast.show(this.i18nModel.getText("enteredEmailNot"));
                return;
            }

            oEmailInput.setValueState("None");

            if (!sOtp || !/^\d{6}$/.test(sOtp)) {
                oOtpInput.setValueState("Error");
                oOtpInput.setValueStateText(this.i18nModel.getText("Entervalid6digitOTP"));
                MessageToast.show(this.i18nModel.getText("Entervalid6digitOTP"));
                return;
            }

            oOtpInput.setValueState("None");
            this.getBusyDialog();

            try {
                const bOtpValid = await this._verifyOTPWithBackend(sOtp);
                if (!bOtpValid) {
                    MessageToast.show(this.i18nModel.getText("incorrectOTP"));
                    return;
                }

                const oUser = this._oVerifiedUser;
                this._oVerifiedUser = null;

                if (!oUser?.UserID || String(oUser.UserID).trim() !== this.sUserID) {
                    MessageToast.show(this.i18nModel.getText("verificationLinkNot"));
                    return;
                }

                await this._applyVerifiedUserLogin(oUser);

                oEmailInput.setValue("");
                oOtpInput.setValue("");
                oEmailInput.setValueState("None");
                oOtpInput.setValueState("None");
                this._resetOtpState();

                const bResumeFeedback = this._bPendingFeedbackRoute;
                this._bPendingFeedbackRoute = false;
                this.getView().removeStyleClass("blur-background");

                MessageToast.show(this.i18nModel.getText("loginSuccessful_"));
                if (oDialog) {
                    oDialog.close();
                }

                if (bResumeFeedback) {
                    await this._onRouteMatched();
                }
            } catch (oError) {
                MessageToast.show(oError?.message || this.i18nModel.getText("invalidCredentialsTry"));
            } finally {
                this.closeBusyDialog();
            }
        },

        _startOtpTimer: function () {
            const oLoginViewModel = this.getView().getModel("LoginViewModel");
            const iStartSeconds = 20;

            this._clearOtpTimer();
            oLoginViewModel.setProperty("/canResendOTP", false);
            oLoginViewModel.setProperty("/otpTimer", iStartSeconds);
            oLoginViewModel.setProperty(
                "/otpButtonText",
                this.i18nModel.getText("feedbackResendOtpCountdown", [iStartSeconds])
            );

            this._otpInterval = setInterval(function () {
                const iRemainingSeconds = oLoginViewModel.getProperty("/otpTimer") - 1;

                if (iRemainingSeconds <= 0) {
                    this._clearOtpTimer();
                    oLoginViewModel.setProperty("/otpTimer", 0);
                    oLoginViewModel.setProperty("/otpButtonText", this.i18nModel.getText("feedbackResendOtp"));
                    oLoginViewModel.setProperty("/canResendOTP", true);
                    return;
                }

                oLoginViewModel.setProperty("/otpTimer", iRemainingSeconds);
                oLoginViewModel.setProperty(
                    "/otpButtonText",
                    this.i18nModel.getText("feedbackResendOtpCountdown", [iRemainingSeconds])
                );
            }.bind(this), 1000);
        },

        _clearOtpTimer: function () {
            if (this._otpInterval) {
                clearInterval(this._otpInterval);
                this._otpInterval = null;
            }
        },

        _resetOtpState: function () {
            const oLoginViewModel = this.getView().getModel("LoginViewModel");

            this._clearOtpTimer();
            oLoginViewModel.setProperty("/otpTimer", 0);
            oLoginViewModel.setProperty("/canResendOTP", true);
            oLoginViewModel.setProperty("/otpButtonText", this.i18nModel.getText("feedbackSendOtp"));
            oLoginViewModel.setProperty("/showOTPField", false);
            oLoginViewModel.setProperty("/isOtpEntered", false);
        },

        onDialogClose: function () {
            const bFeedbackAccessPending = this._bPendingFeedbackRoute;
            const oEmailInput = sap.ui.core.Fragment.byId(this.createId("LoginAlertDialog"), "emailInput");
            const oOtpInput = sap.ui.core.Fragment.byId(this.createId("LoginAlertDialog"), "otpInput");

            if (oEmailInput) {
                oEmailInput.setValue("");
                oEmailInput.setValueState("None");
                oEmailInput.setValueStateText("");
            }

            if (oOtpInput) {
                oOtpInput.setValue("");
                oOtpInput.setValueState("None");
                oOtpInput.setValueStateText("");
            }

            this._resetOtpState();
            this._bPendingFeedbackRoute = false;
            this._oResetUser = null;
            this._oVerifiedUser = null;
            this.getView().removeStyleClass("blur-background");

            if (this._oLoginAlertDialog?.isOpen()) {
                this._oLoginAlertDialog.close();
            }

            if (bFeedbackAccessPending) {
                this.getOwnerComponent().getRouter().navTo("RouteHostel", {}, true);
            }
        },

        // Helper to reset all data
        _resetAllData: function () {
            // Reset model
            const oModel = this.getView().getModel("feedbackData");
            oModel.setProperty("/bookingId", "");
            oModel.setProperty("/customerId", "");
            oModel.setProperty("/customerName", "");
            oModel.setProperty("/customerEmail", "");
            oModel.setProperty("/BedType", "");
            oModel.setProperty("/branchCode", "");
            oModel.setProperty("/roomNo", "");
            oModel.setProperty("/ratings", {
                overall: 0,
                cleanliness: 0,
                staff: 0,
                amenities: 0,
                value: 0
            });
            oModel.setProperty("/comments", "");
            oModel.setProperty("/recommend", null);
            oModel.setProperty("/visitAgain", null);
            oModel.setProperty("/submitted", false);

            // Reset UI controls if they exist
            const ratingIds = ["ratingOverall", "ratingCleanliness", "ratingStaff", "ratingAmenities", "ratingValue"];
            ratingIds.forEach(id => {
                const control = this.byId(id);
                if (control) control.setValue(0);
            });

            // Reset radio buttons
            const radioGroups = ["rgRecommend", "rgVisitAgain"];
            radioGroups.forEach(groupId => {
                const group = this.byId(groupId);
                if (group) group.setSelectedIndex(-1);
            });

            // Reset comments
            const commentsArea = this.byId("feedbackComments");
            if (commentsArea) commentsArea.setValue("");
        },

        // Rating change handlers
        onOverallRatingChange: function (oEvent) {
            const iValue = oEvent.getParameter("value");
            this.getView().getModel("feedbackData").setProperty("/ratings/overall", iValue);
        },

        onCleanlinessRatingChange: function (oEvent) {
            const iValue = oEvent.getParameter("value");
            this.getView().getModel("feedbackData").setProperty("/ratings/cleanliness", iValue);
        },

        onStaffRatingChange: function (oEvent) {
            const iValue = oEvent.getParameter("value");
            this.getView().getModel("feedbackData").setProperty("/ratings/staff", iValue);
        },

        onAmenitiesRatingChange: function (oEvent) {
            const iValue = oEvent.getParameter("value");
            this.getView().getModel("feedbackData").setProperty("/ratings/amenities", iValue);
        },

        onValueRatingChange: function (oEvent) {
            const iValue = oEvent.getParameter("value");
            this.getView().getModel("feedbackData").setProperty("/ratings/value", iValue);
        },

        // Comments change handler
        onCommentsChange: function (oEvent) {
            const sValue = oEvent.getSource().getValue();
            this.getView().getModel("feedbackData").setProperty("/comments", sValue);
        },

        // Radio button change handlers
        onRecommendChange: function (oEvent) {
            const iSelectedIndex = oEvent.getSource().getSelectedIndex();
            this.getView().getModel("feedbackData").setProperty("/recommend", iSelectedIndex === 0);
        },

        onVisitAgainChange: function (oEvent) {
            const iSelectedIndex = oEvent.getSource().getSelectedIndex();
            this.getView().getModel("feedbackData").setProperty("/visitAgain", iSelectedIndex === 0);
        },

        // Main Submit Feedback function
        onSubmitFeedback: async function () {
            try {
                // Re-check the shared session in case another tab changed users
                // after this feedback page was opened.
                if (!this._isFeedbackAccessAllowed()) {
                    await this._onRouteMatched();
                    return;
                }

                const uiValues = {
                    overall: this.byId("ratingOverall")?.getValue() || 0,
                    cleanliness: this.byId("ratingCleanliness")?.getValue() || 0,
                    staff: this.byId("ratingStaff")?.getValue() || 0,
                    amenities: this.byId("ratingAmenities")?.getValue() || 0,
                    value: this.byId("ratingValue")?.getValue() || 0
                };

                // Get model data
                const oModel = this.getView().getModel("feedbackData");
                const modelData = oModel.getData();
                const mRatingLabels = {
                    overall: this.i18nModel.getText("feedbackOverallName"),
                    cleanliness: this.i18nModel.getText("feedbackCleanlinessName"),
                    staff: this.i18nModel.getText("feedbackStaffName"),
                    amenities: this.i18nModel.getText("feedbackAmenitiesName"),
                    value: this.i18nModel.getText("feedbackValueName")
                };

                for (const [category, value] of Object.entries(uiValues)) {
                    if (value < 1 || value > 5) {
                        MessageToast.show(
                            this.i18nModel.getText("feedbackRatingRequired", [mRatingLabels[category]])
                        );
                        return;
                    }
                }

                if (modelData.recommend === null) {
                    MessageToast.show(this.i18nModel.getText("feedbackSelectRecommendation"));
                    return;
                }

                // Create payload
                const payload = {
                    data: {
                        BookingID: modelData.bookingId,
                        RoomNo: modelData.roomNo,
                        BranchCode: modelData.branchCode,
                        BedType: modelData.BedType,
                        OverallRating: uiValues.overall,
                        CleanlinessRating: uiValues.cleanliness,
                        StaffRating: uiValues.staff,
                        AmenitiesRating: uiValues.amenities,
                        ValueRating: uiValues.value,
                        Comments: modelData.comments || "",
                        WouldRecommend: modelData.recommend === true,
                        WouldVisitAgain: modelData.visitAgain === true,
                        FeedbackDate: new Date().toISOString().split("T")[0],
                        SubmissionTime: new Date().toTimeString().split(" ")[0],
                        CustomerName: modelData.customerName,
                        Status: "Submitted"
                    }
                };

                this.getBusyDialog();
                await this.ajaxCreateWithJQuery("HM_Feedback", payload);

                MessageBox.success(this.i18nModel.getText("feedbackThanks"), {
                    title: this.i18nModel.getText("feedbackSubmittedTitle"),
                    styleClass: "myUnifiedBtn",
                    onClose: () => {
                        this.CommonLogoutFunction();
                    }
                });

            } catch (err) {
                MessageToast.show(err?.message || this.i18nModel.getText("feedbackSubmitFailed"));
            } finally {
                this.closeBusyDialog();
            }
        },

        BI_onButtonPress: function () {
            this.getOwnerComponent().getRouter().navTo("RouteHostel");
        }
    });
});
