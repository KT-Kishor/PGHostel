sap.ui.define([
    "./BaseController", //call base controller 
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast"
], function (BaseController, JSONModel, MessageToast) {
    "use strict";
    return BaseController.extend("sap.ui.com.project1.controller.TilePage", {
        onInit: function () {
            this.getOwnerComponent().getRouter().getRoute("TilePage").attachMatched(this._onRouteMatched, this);
        },

        _onRouteMatched: function () {
            this.AppVisibilityReadCall();
        },

        AppVisibilityReadCall: async function () {
            try {
                sap.ui.core.BusyIndicator.show(0);
                this.commonLoginFunction();
                const oLoginModel = this.getOwnerComponent().getModel("LoginModel");
                let filter = { Role: oLoginModel.getProperty("/Role") }
                const oData = await this.ajaxReadWithJQuery("HM_AppVisibility", filter);
                var oModel = new JSONModel(oData.data[0]);
                this.getOwnerComponent().setModel(oModel, "TileVisibility");
            } catch (err) {
                sap.ui.core.BusyIndicator.hide();
                sap.m.MessageToast.show(err.message || err.responseText);
            } finally {
                sap.ui.core.BusyIndicator.hide();
            }
        },

        TileV_onpressInbox: function () {
            var oRouter = this.getOwnerComponent().getRouter();
            oRouter.navTo("RouteAdmin");
        },
        Tile_onLogPress: function () {
            this.CommonLogoutFunction();
        },
        TileV_onpressroomdetails: function () {
            var oRouter = this.getOwnerComponent().getRouter();
            oRouter.navTo("RouteRoomDetails");
        },
        TileV_onpressbeddetails: function () {
            var oRouter = this.getOwnerComponent().getRouter();
            oRouter.navTo("RouteBedDetails");
        },
        TileV_onpressextrafacilities: function () {
            var oRouter = this.getOwnerComponent().getRouter();
            oRouter.navTo("RouteFacilitis", { value: "Facilities", });
        },
        TileV_onpressBedImages: function () {
            var oRouter = this.getOwnerComponent().getRouter();
            oRouter.navTo("RouteRoomImages");
        },
        TileV_onpressfacilities: function () {
            var oRouter = this.getOwnerComponent().getRouter();
            oRouter.navTo("RouteFacilitiesDetails");
        },
        TileV_onpressmaintaindata: function () {
            var oRouter = this.getOwnerComponent().getRouter();
            oRouter.navTo("RouteMaintainData");
        },
        TileV_onpressBranchdata: function () {
            var oRouter = this.getOwnerComponent().getRouter();
            oRouter.navTo("RouteBranchData");
        },
        TileV_onpresshostelfeatures: function () {
            var oRouter = this.getOwnerComponent().getRouter();
            oRouter.navTo("RouteHostelFeatures");
        },
        TileV_onpressManageInvoice: function () {
            var oRouter = this.getOwnerComponent().getRouter();
            oRouter.navTo("RouteManageInvoice");
        },
        TileV_onpressCouponDetails: function () {
            var oRouter = this.getOwnerComponent().getRouter();
            oRouter.navTo("RouteCouponDetails");
        },
        TileV_onpressManageStaff: function () {
            var oRouter = this.getOwnerComponent().getRouter();
            oRouter.navTo("RouteManageStaff");
        },
        TileV_onpressManageVendor: function () {
            var oRouter = this.getOwnerComponent().getRouter();
            oRouter.navTo("RouteManageVendor");
        },

        onStartGuide: function () {
            var oGuideModel = this.getOwnerComponent().getModel("guideModel");
            var aSteps = oGuideModel.getData().steps;
            this._highlightAllTiles(aSteps);

            if (!this._oGuideDialog) {
                this._oGuideDialog = new sap.m.Dialog({
                    title: "Steps to Know",
                    contentWidth: "900px",
                    contentHeight: "600px",
                    resizable: true,
                    draggable: true,
                    content: [
                        new sap.m.Image({
                            src: "image/PG1.png",
                            width: "100%",
                            densityAware: false
                        })
                    ],
                    endButton: new sap.m.Button({
                        text: "Close",
                        press: function () {
                            this._oGuideDialog.close();
                            this._clearHighlights(aSteps);
                        }.bind(this)
                    })
                });
                this.getView().addDependent(this._oGuideDialog);
            }

            this._oGuideDialog.open();
        },

        _highlightAllTiles: function (aSteps) {
            aSteps.forEach(function (step) {
                var oTile = this.byId(step.tileId);
                if (oTile) {
                    oTile.addStyleClass("highlightTile");
                }
            }.bind(this));
        },

        _clearHighlights: function (aSteps) {
            aSteps.forEach(function (step) {
                var oTile = this.byId(step.tileId);
                if (oTile) {
                    oTile.removeStyleClass("highlightTile");
                }
            }.bind(this));
        }
    })
})