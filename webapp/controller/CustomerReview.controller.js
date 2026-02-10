sap.ui.define([
    "./BaseController",
    "sap/m/MessageBox",
    "sap/m/MessageToast",
    "sap/ui/model/json/JSONModel",
    "../model/formatter"
], function (BaseController, MessageBox, MessageToast, JSONModel, Formatter) {
    "use strict";
    return BaseController.extend("sap.ui.com.project1.controller.CustomerReview", {
        Formatter: Formatter,
        onInit: function () {
            this.getOwnerComponent().getRouter().getRoute("RouteCustomerReview").attachMatched(this._onRouteMatched, this);
        },

        _onRouteMatched: async function () {
            this.i18nModel = this.getView().getModel("i18n").getResourceBundle();
            // var data = this.getOwnerComponent().getModel("SelectedBedType").getData();
            // await this._loadCustomerReviews(data);
            this.commonLoginFunction();
            this._setDefaultDateRange();
            await this._loadCustomers();
            await this._buildBranchMap();
            await this._loadCustomerReviews();
        },

        _getBranchName: function (sBranchCode) {
            return this._mBranchMap?.[sBranchCode] || sBranchCode || "N/A";
        },

        _getCustomerName: function (sCustomerID) {
            return this._mCustomerMap?.[sCustomerID] || sCustomerID || "N/A";
        },

        getBranch: async function () {
            const oComponent = this.getOwnerComponent();
            let oBRModel = oComponent.getModel("sBRModel");

            if (!oBRModel) {
                await oComponent._fetchCommonData("HM_Branch", "sBRModel");
                oBRModel = oComponent.getModel("sBRModel");
            }
            const aData = oBRModel?.getData();
            return Array.isArray(aData) ? aData : [];
        },

        _buildBranchMap: async function () {
            const aBranches = await this.getBranch();
            const mBranchMap = {};

            aBranches.forEach(b => {
                const sBranchCode = b.BranchID;
                mBranchMap[sBranchCode] = b.Name;
            });
            this._mBranchMap = mBranchMap;
        },

        _loadCustomerReviews: function (data) {
            // var BedTypeName = `${data.Name} - ${data.ACType}`;
            // var filters = {
            //     BranchCode: data.BranchCode,
            //     BedType: BedTypeName
            // };
            const oBox = this.byId("CR_id_ReviewContainer");
            oBox.removeAllItems();
            sap.ui.core.BusyIndicator.show(0);

            this.ajaxReadWithJQuery("HM_Feedback", {}).then((oData) => {
                console.log("HM_Feedback response:", oData.commentData);
                let aFeedbacks = Array.isArray(oData.commentData) ? oData.commentData : [oData.commentData];
                aFeedbacks = this._sortFeedbacksDefault(aFeedbacks);
                this._aAllFeedbacks = aFeedbacks;
                this._applyFilters();
                sap.ui.core.BusyIndicator.hide();
            }).catch(function () {
                sap.ui.core.BusyIndicator.hide();
                sap.m.MessageToast.show("Failed to load customer reviews");
            });
        },

        onHome: function () {
            this.CommonLogoutFunction();
            this.getView().getModel("mainModel").setData({});
        },

        onNavBack: function () {
            var oRouter = this.getOwnerComponent().getRouter();
            oRouter.navTo("TilePage");
        },

        _sortFeedbacksDefault: function (aData) {
            if (!Array.isArray(aData)) {
                return aData;
            }

            return [...aData].sort((a, b) => {
                const dateDiff =
                    new Date(b.FeedbackDate) - new Date(a.FeedbackDate);

                if (dateDiff !== 0) {
                    return dateDiff;
                }

                const ratingDiff =
                    Number(b.OverallRating) - Number(a.OverallRating);

                if (ratingDiff !== 0) {
                    return ratingDiff;
                }

                return 0;
            });
        },

        _loadCustomers: function () {
            return this.ajaxReadWithJQuery("HM_Customer", {}).then((oData) => {
                const aCustomers = Array.isArray(oData.Customers) ? oData.Customers : [];
                const mCustomerMap = {};

                aCustomers.forEach(c => {
                    mCustomerMap[c.CustomerID] = c.CustomerName || c.Name;
                });

                this._mCustomerMap = mCustomerMap;
            });
        },

        _setDefaultDateRange: function () {
            const oDRS = this.byId("CR_id_BranchCode");
            const oToday = new Date();
            const oFrom = new Date(oToday.getFullYear(), oToday.getMonth(), 1);
            const oTo = new Date(oToday.getFullYear(), oToday.getMonth() + 1, 0);
            oDRS.setDateValue(oFrom);
            oDRS.setSecondDateValue(oTo);
        },

        _applyFilters: function () {
            const oBox = this.byId("CR_id_ReviewContainer");
            oBox.removeAllItems();
            const oDRS = this.byId("CR_id_BranchCode");
            const oRatingCB = this.byId("CR_id_Rating");

            const dFrom = oDRS.getDateValue();
            const dTo = oDRS.getSecondDateValue();
            const sRating = oRatingCB.getSelectedKey();
            let aFiltered = this._aAllFeedbacks || [];
            // if (dFrom && dTo) {
            //     aFiltered = aFiltered.filter(f => {
            //         const dFeedback = new Date(f.FeedbackDate);
            //         return dFeedback >= dFrom && dFeedback <= dTo;
            //     });
            // }
            if (sRating) {
                aFiltered = aFiltered.filter(f =>
                    Number(f.OverallRating) === Number(sRating)
                );
            }
            aFiltered.forEach(f => {
                const oCard = new sap.ui.integration.widgets.Card({
                    manifest: "cards/CustomerCard.json",
                    parameters: {
                        CustomerName: this._getCustomerName(f.CustomerID),
                        BedType: f.BedType,
                        OverallRating: Number(f.OverallRating),
                        CleanlinessRating: Number(f.CleanlinessRating),
                        AmenitiesRating: Number(f.AmenitiesRating),
                        StaffRating: Number(f.StaffRating),
                        ValueRating: Number(f.ValueRating),
                        Comments: f.Comments,
                        FeedbackDate: this.Formatter.formatDate(f.FeedbackDate),
                        BranchName: this._getBranchName(f.BranchCode)
                    },
                    width: "100%",
                    height: "550px"
                });
                oBox.addItem(oCard);
            });
        },

        CR_onSearch: function () {
            this._applyFilters();
        },

        CR_onPressClear: function () {
            this.byId("CR_id_Rating").setSelectedKey("");
            this.byId("CR_id_BranchCode").setValue("");
            this._applyFilters();
        },
    })
})