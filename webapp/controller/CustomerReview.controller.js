sap.ui.define([
    "./BaseController",
    "../model/formatter",
    "sap/m/MessageToast"
], function (BaseController, Formatter, MessageToast) {
    "use strict";
    return BaseController.extend("sap.ui.com.project1.controller.CustomerReview", {
        Formatter: Formatter,
        onInit: function () {
            this.getOwnerComponent().getRouter().getRoute("RouteCustomerReview").attachMatched(this._onRouteMatched, this);
        },

        _onRouteMatched: async function () {
            this.i18nModel = this.getView().getModel("i18n").getResourceBundle();
            this.data = this.getOwnerComponent().getModel("SelectedBedType") ? this.getOwnerComponent().getModel("SelectedBedType").getData() : {};
            this._resetFiltersOnEntry();
            this._setDefaultDateRange();
            sap.ui.core.BusyIndicator.show(0);
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

        _loadCustomerReviews: function () {
            var data = this.data;
            const oExistingModel = this.getOwnerComponent().getModel("LoginModel").getData();
            const omainModel = this.getOwnerComponent().getModel("mainModel")?.getData() || [];

            let aBranchCodes = "";
            if (Array.isArray(omainModel) && omainModel.length) {
                aBranchCodes = omainModel.map(item => item.BranchID).flat().filter(Boolean).join(",");
            } else if (oExistingModel.BranchCode) {
                aBranchCodes = oExistingModel.BranchCode;
            }

            const oDRS = this.byId("CR_id_BranchCode");
            const oRatingCB = this.byId("CR_id_Rating");
            const oSortCB = this.byId("CR_id_Sort");

            const dFrom = oDRS.getDateValue();
            const dTo = oDRS.getSecondDateValue();
            const sRating = oRatingCB.getSelectedKey();
            const sSortKey = oSortCB.getSelectedKey();

            // var BedTypeName = `${data?.Name || ""}${data?.Name && data?.ACType ? " - " : ""}${data?.ACType || ""}`;

            var filters = {
                // BedType: BedTypeName,
                StartDate: dFrom ? this.Formatter.formatDate(dFrom).split("/").reverse().join("-") : "",
                EndDate: dTo ? this.Formatter.formatDate(dTo).split("/").reverse().join("-") : "",
                OverallRating: sRating || "",
                SortKey: sSortKey || ""
            };
            if (oExistingModel.Role === "Admin" && aBranchCodes) {
                filters.BranchCode = aBranchCodes;
                filters.Role = "Admin";
            } else if (oExistingModel.Role === "SuperAdmin" ) {
                    filters.BranchCode = "";
            } else {
                filters.BranchCode =  oExistingModel.BranchCode;
            }
            const that = this;
            const oBox = this.byId("CR_id_ReviewContainer");
            oBox.removeAllItems();
            sap.ui.core.BusyIndicator.show(0);

            this.ajaxReadWithJQuery("HM_Feedback", filters).then(function (oData) {
                const aFeedbacks = Array.isArray(oData.commentData) ? oData.commentData : [oData.commentData];

                that._aAllFeedbacks = aFeedbacks;
                that._applyFilters();
                sap.ui.core.BusyIndicator.hide();
            }).catch(function () {
                sap.ui.core.BusyIndicator.hide();
                MessageToast.show("Failed to load customer reviews");
            });
        },

        onHome: function () {
            const oBox = this.byId("CR_id_ReviewContainer");
            this.CommonLogoutFunction();
            this.getOwnerComponent().getModel("SelectedBedType").setData("");
            oBox.removeAllItems();
            this._aAllFeedbacks = [];
        },

        onNavBack: function () {
            const oBox = this.byId("CR_id_ReviewContainer");
            const oLoginModel = this.getView().getModel("LoginModel");
            const sRole = oLoginModel?.getProperty("/Role") || "";
            if (sRole === "Admin") {
                this.getOwnerComponent().getRouter().navTo("TilePage");
            } else {
                const sTabKey = "idRooms"
                this.getOwnerComponent().getRouter().navTo("RouteHostel");
                sessionStorage.setItem("homePageReturnTab", sTabKey);
                this.getOwnerComponent().getModel("SelectedBedType").setData("")
            }
            oBox.removeAllItems();
            this._aAllFeedbacks = [];
        },

        _sortFeedbacksDefault: function (aData) {
            if (!Array.isArray(aData)) {
                return aData;
            }
            return [...aData].sort((a, b) => {
                const dateDiff = new Date(b.FeedbackDate) - new Date(a.FeedbackDate);
                if (dateDiff !== 0) {
                    return dateDiff;
                }
                const ratingDiff = Number(b.OverallRating) - Number(a.OverallRating);
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
            const oFrom = new Date( oToday.getFullYear(),0, 1);
            const oTo = new Date(oToday.getFullYear(), 11, 31);
            oDRS.setDateValue(oFrom);
            oDRS.setSecondDateValue(oTo);
        },

        _applyFilters: function () {
            const oBox = this.byId("CR_id_ReviewContainer");
            oBox.removeAllItems();
            let aFiltered = this._aAllFeedbacks || [];
            if (aFiltered.length === 0) {
                this._showIllustration(
                    sap.m.IllustratedMessageType.NoData,
                    "No Reviews Found",
                    "There are no customer reviews available."

                )
                return;
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
                        Comments: f.Comments || "NO COMMENTS PROVIDED",
                        FeedbackDate: this.Formatter.formatDate(f.FeedbackDate),
                        BranchName: this._getBranchName(f.BranchCode)
                    },
                    height: "550px",
                    width: "100%"
                });
                oBox.addItem(oCard);
            });
        },

        _showIllustration: function (type, title, description) {
            const oBox = this.byId("CR_id_ReviewContainer");
            oBox.removeAllItems();
            const oIllustration = new sap.m.IllustratedMessage({
                illustrationType: type,
                illustrationSize: sap.m.IllustratedMessageSize.Scene,
                title: title,
                description: description
            });

            const oWrapper = new sap.m.VBox({
                width: "100%",
                height: "100%",
                alignItems: "Center",
                justifyContent: "Center",
                items: [oIllustration]
            });

            oBox.addItem(oWrapper);
        },

        CR_onSearch: function () {
            this._loadCustomerReviews(data);
        },

        CR_onPressClear: function () {
            this.byId("CR_id_Rating").setSelectedKey("");
            this.byId("CR_id_BranchCode").setValue("");
            this.byId("CR_id_Sort").setValue("");
        },

        _resetFiltersOnEntry: function () {
            const oFilterBar = this.byId("CR_id_Filterbar");
            this.byId("CR_id_Rating").setSelectedKey("");
            this.byId("CR_id_Sort").setSelectedKey("");

            oFilterBar.clear();
                this._setDefaultDateRange();
        }
    })
})