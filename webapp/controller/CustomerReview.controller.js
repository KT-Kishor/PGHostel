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
            var data = this.getOwnerComponent().getModel("SelectedBedType").getData();
            await this._loadCustomerReviews(data);
        },

        _getBranchName: function (sBranchCode) {
            const aBranches = this.getOwnerComponent().getModel("sBRModel").getData() || [];
            const oBranch = aBranches.find(b => b.BranchCode === sBranchCode);
            return oBranch ? oBranch.Name : sBranchCode;
        },

        _loadCustomerReviews: function (data) {
            var BedTypeName = `${data.Name} - ${data.ACType}`;

            var filters = {
                BranchCode: data.BranchCode,
                BedType: BedTypeName
            };


            const that = this;
            const oBox = this.byId("CR_id_ReviewContainer");
            oBox.removeAllItems();
            sap.ui.core.BusyIndicator.show(0);

            this.ajaxReadWithJQuery("HM_Feedback", filters).then(function (oData) {
                console.log("HM_Feedback response:", oData.commentData);
                const aFeedbacks = Array.isArray(oData.commentData) ? oData.commentData : [oData.commentData];
                //                 if (!aFeedbacks.length) {
                //     oBox.setBusy(false);
                //     MessageToast.show("No customer reviews found");
                //     return;
                // }
                aFeedbacks.forEach(function (oFeedback) {
                    const sBranchName = that._getBranchName(oFeedback.BranchCode);

                    const oCard = new sap.ui.integration.widgets.Card({
                        manifest: "cards/CustomerCard.json",
                        parameters: {
                            CustomerName: oFeedback.CustomerID,
                            BedType: oFeedback.BedType,
                            OverallRating: Number(oFeedback.OverallRating),
                            Comments: oFeedback.Comments,
                            FeedbackDate: that.Formatter.formatDate(oFeedback.FeedbackDate),
                            BranchName: sBranchName
                        },
                        width: "320px"
                    });

                    oBox.addItem(oCard);
                });

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
    })
})