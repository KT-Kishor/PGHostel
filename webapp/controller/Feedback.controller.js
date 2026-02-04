sap.ui.define([
    "./BaseController",
    "sap/m/MessageBox",
    "sap/m/MessageToast"
], function(BaseController, MessageBox, MessageToast) {
    "use strict";

    return BaseController.extend("sap.ui.com.project1.controller.Feedback", {
        onInit: function() {
            // Attach route
            this.getOwnerComponent().getRouter().getRoute("RouteFeedback").attachMatched(this._onRouteMatched, this);

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

        _onRouteMatched: async function(oEvent) {
            sap.ui.core.BusyIndicator.show(0);

            try {
                const encodedBookingID = oEvent.getParameter("arguments")?.bookingId;

                if (!encodedBookingID) {
                    return this._goToNotFound();
                }

                // Base64 format validation
                const base64Regex =
                    /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/;

                if (!base64Regex.test(encodedBookingID)) {
                    return this._goToNotFound();
                }

                // Decode BookingID safely
                let decodedBookingID;
                try {
                    decodedBookingID = atob(encodedBookingID);
                } catch {
                    return this._goToNotFound();
                }

                // Re-encode check (tamper protection)
                if (btoa(decodedBookingID) !== encodedBookingID) {
                    return this._goToNotFound();
                }

                // Validate booking exists
                const bValid = await this._validateBookingID(decodedBookingID);
                if (!bValid) {
                    return this._goToNotFound();
                }

                // Reset old feedback data
                this._resetAllData();

                // Store booking ID in model
                const oModel = this.getView().getModel("feedbackData");
                oModel.setProperty("/bookingId", decodedBookingID);

                // Load booking details
                await this._loadBookingDetails(decodedBookingID);
            } catch (e) {
                this._goToNotFound();
            } finally {
                sap.ui.core.BusyIndicator.hide();
            }
        },

        _validateBookingID: async function(sBookingID) {
            try {
                const oFeedbackResp = await this.ajaxReadWithJQuery("HM_Feedback", {
                    BookingID: sBookingID
                });

                const aFeedback = oFeedbackResp?.commentData || [];
                if (
                    Array.isArray(aFeedback) &&
                    aFeedback.length > 0 &&
                    aFeedback[0].Status === "Submitted"
                ) {
                    return false;
                }

                const oBookingResp = await this.ajaxReadWithJQuery("HM_Booking", {
                    BookingID: sBookingID
                });

                return (
                    Array.isArray(oBookingResp?.commentData) &&
                    oBookingResp.commentData.length === 1
                );

            } catch (err) {
                return false;
            }
        },

        _goToNotFound: function() {
            this.getOwnerComponent().getRouter().navTo("NotFound", {}, true);
        },

        _loadBookingDetails: async function(bookingId) {
            try {
                sap.ui.core.BusyIndicator.show(0);

                const payload = {
                    filters: {
                        BookingID: bookingId
                    }
                };

                const oData = await this.ajaxReadWithJQuery("HM_Booking", payload);

                if (!oData || !oData.commentData || oData.commentData.length === 0) {
                    MessageBox.error("Invalid booking or booking not found.");
                    return;
                }

                const booking = oData.commentData[0];
                const oModel = this.getView().getModel("feedbackData");

                oModel.setProperty("/customerId", booking.CustomerID);
                oModel.setProperty("/customerName", booking.CustomerName);
                oModel.setProperty("/customerEmail", booking.CustomerEmail);
                oModel.setProperty("/roomNo", booking.RoomNo);
                oModel.setProperty("/branchCode", booking.BranchCode);
                oModel.setProperty("/BedType", booking.BedType);

            } catch (error) {
                MessageBox.error("Failed to load booking details");
            } finally {
                sap.ui.core.BusyIndicator.hide();
            }
        },


        // Helper to reset all data
        _resetAllData: function() {
            // Reset model
            const oModel = this.getView().getModel("feedbackData");
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
        onOverallRatingChange: function(oEvent) {
            const iValue = oEvent.getParameter("value");
            this.getView().getModel("feedbackData").setProperty("/ratings/overall", iValue);
        },

        onCleanlinessRatingChange: function(oEvent) {
            const iValue = oEvent.getParameter("value");
            this.getView().getModel("feedbackData").setProperty("/ratings/cleanliness", iValue);
        },

        onStaffRatingChange: function(oEvent) {
            const iValue = oEvent.getParameter("value");
            this.getView().getModel("feedbackData").setProperty("/ratings/staff", iValue);
        },

        onAmenitiesRatingChange: function(oEvent) {
            const iValue = oEvent.getParameter("value");
            this.getView().getModel("feedbackData").setProperty("/ratings/amenities", iValue);
        },

        onValueRatingChange: function(oEvent) {
            const iValue = oEvent.getParameter("value");
            this.getView().getModel("feedbackData").setProperty("/ratings/value", iValue);
        },

        // Comments change handler
        onCommentsChange: function(oEvent) {
            const sValue = oEvent.getSource().getValue();
            this.getView().getModel("feedbackData").setProperty("/comments", sValue);
        },

        // Radio button change handlers
        onRecommendChange: function(oEvent) {
            const sValue = oEvent.getSource().getSelectedButton().getText();
            this.getView().getModel("feedbackData").setProperty("/recommend", sValue);
        },

        onVisitAgainChange: function(oEvent) {
            const sValue = oEvent.getSource().getSelectedButton().getText();
            this.getView().getModel("feedbackData").setProperty("/visitAgain", sValue);
        },

        // Main Submit Feedback function
        onSubmitFeedback: async function() {
            try {
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

                // =======================
                // 1️⃣ Validate RATINGS FIRST
                // =======================
                for (const [category, value] of Object.entries(uiValues)) {
                    if (value < 1 || value > 5) {
                        MessageToast.show(
                            `Please rate ${category.replace(/([A-Z])/g, " $1").toLowerCase()} (1–5 stars)`
                        );
                        return; // HARD STOP
                    }
                }

                // =======================
                // 2️⃣ Validate RECOMMENDATION SECOND
                // =======================
                if (!modelData.recommend) {
                    MessageToast.show("Please select if you would recommend us");
                    return;
                }

                // Create payload
                const payload = {
                    data: {
                        BookingID: modelData.bookingId,
                        CustomerID: modelData.customerId,
                        CustomerName: modelData.customerName,
                        CustomerEmail: modelData.customerEmail,
                        RoomNo: modelData.RoomNo,
                        BranchCode: modelData.BranchCode,
                        BedType: modelData.BedType,
                        OverallRating: uiValues.overall,
                        CleanlinessRating: uiValues.cleanliness,
                        StaffRating: uiValues.staff,
                        AmenitiesRating: uiValues.amenities,
                        ValueRating: uiValues.value,
                        Comments: modelData.comments || "",
                        WouldRecommend: modelData.recommend === "Yes",
                        WouldVisitAgain: modelData.visitAgain === "Yes",
                        FeedbackDate: new Date().toISOString().split("T")[0],
                        SubmissionTime: new Date().toTimeString().split(" ")[0],
                        Status: "Submitted"
                    }
                };

                sap.ui.core.BusyIndicator.show(0);
                await this.ajaxCreateWithJQuery("HM_Feedback", payload);

                MessageBox.success("Thank you for your feedback!", {
                    title: "Feedback Submitted",
                    onClose: () => {
                        this.getOwnerComponent().getRouter().navTo("RouteHostel");
                    }
                });

            } catch (err) {
                sap.m.MessageToast.show(err?.message || "Failed to submit feedback");
            } finally {
                sap.ui.core.BusyIndicator.hide();
            }
        },

        BI_onButtonPress: function() {
            this.getOwnerComponent().getRouter().navTo("RouteHostel");
        }
    });
});