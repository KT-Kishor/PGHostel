sap.ui.define([
    "./BaseController",
    "sap/m/MessageBox",
    "sap/m/MessageToast"
], function(BaseController, MessageBox, MessageToast) {
    "use strict";

    return BaseController.extend("sap.ui.com.project1.controller.Feedback", {
        onInit: function() {
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
            this.getBusyDialog()

            try {
                const encodedBookingID = oEvent.getParameter("arguments")?.bookingId;
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
                } catch {
                    return this._goToNotFound();
                }

                if (btoa(decodedBookingID) !== encodedBookingID) {
                    return this._goToNotFound();
                }

                // Validate + fetch booking in ONE call
                const booking = await this._validateAndFetchBooking(decodedBookingID);
                if (!booking) {
                    return this._goToNotFound();
                }

                this._resetAllData();

                const oModel = this.getView().getModel("feedbackData");
                oModel.setProperty("/bookingId", decodedBookingID);
                oModel.setProperty("/customerId", booking.CustomerID);
                oModel.setProperty("/roomNo", booking.RoomNo);
                oModel.setProperty("/branchCode", booking.BranchCode);
                oModel.setProperty("/BedType", booking.BedType);

            } catch (e) {
                this._goToNotFound();
            } finally {
                this.closeBusyDialog()
            }
        },

        _validateAndFetchBooking: async function(sBookingID) {
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

        _goToNotFound: function() {
            this.getOwnerComponent().getRouter().navTo("NotFound", {}, true);
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
                        RoomNo: modelData.roomNo,
                        BranchCode: modelData.branchCode,
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

                this.getBusyDialog()
                await this.ajaxCreateWithJQuery("HM_Feedback", payload);

                MessageBox.success("Thank you for your feedback!", {
                    title: "Feedback Submitted",
                    styleClass: "myUnifiedBtn",
                    onClose: () => {
                        this.getOwnerComponent().getRouter().navTo("RouteHostel");
                    }
                });

            } catch (err) {
                sap.m.MessageToast.show(err?.message || "Failed to submit feedback");
            } finally {
                this.closeBusyDialog()
            }
        },

        BI_onButtonPress: function() {
            this.getOwnerComponent().getRouter().navTo("RouteHostel");
        }
    });
});