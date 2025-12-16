sap.ui.define([
   "./BaseController", //call base controller 
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast"
], function(BaseController, JSONModel, MessageToast) {
    "use strict";
    return BaseController.extend("sap.ui.com.project1.controller.TilePage", {
        onInit: function() {
            this.getOwnerComponent().getRouter().getRoute("TilePage").attachMatched(this._onRouteMatched, this);
        },
        _onRouteMatched: function() {
             this.AppVisibilityReadCall();
        },
        
        AppVisibilityReadCall: async function () {
            try {
                sap.ui.core.BusyIndicator.show(0);
                this.commonLoginFunction();
                const oLoginModel = this.getOwnerComponent().getModel("LoginModel");
                let filter = {Role : oLoginModel.getProperty("/Role")}
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

        TileV_onpressInbox: function() {
            var oRouter = this.getOwnerComponent().getRouter();
            oRouter.navTo("RouteAdmin");
        },
        Tile_onLogPress: function() {
            var oRouter = this.getOwnerComponent().getRouter();
            oRouter.navTo("RouteHostel");
        },
        TileV_onpressroomdetails: function() {
            var oRouter = this.getOwnerComponent().getRouter();
            oRouter.navTo("RouteRoomDetails");
        },
        TileV_onpressbeddetails: function() {
            var oRouter = this.getOwnerComponent().getRouter();
            oRouter.navTo("RouteBedDetails");
        },
        TileV_onpressextrafacilities: function() {
            var oRouter = this.getOwnerComponent().getRouter();
            oRouter.navTo("RouteFacilitis", {value: "Facilities", });
        },
        TileV_onpressBedImages: function() {
            var oRouter = this.getOwnerComponent().getRouter();
            oRouter.navTo("RouteRoomImages");
        },
        TileV_onpressfacilities: function() {
            var oRouter = this.getOwnerComponent().getRouter();
            oRouter.navTo("RouteFacilitiesDetails");
        },
          TileV_onpressmaintaindata:function(){
                var oRouter = this.getOwnerComponent().getRouter();
               oRouter.navTo("RouteMaintainData");
        },
        TileV_onpressBranchdata:function(){
            var oRouter = this.getOwnerComponent().getRouter();
           oRouter.navTo("RouteBranchData");
        },
        TileV_onpresshostelfeatures:function(){
            var oRouter = this.getOwnerComponent().getRouter();
           oRouter.navTo("RouteHostelFeatures");
        },
        TileV_onpressManageInvoice:function(){
            var oRouter = this.getOwnerComponent().getRouter();
           oRouter.navTo("RouteManageInvoice");
        }, 
        TileV_onpressCouponDetails: function () {
            var oRouter = this.getOwnerComponent().getRouter();
            oRouter.navTo("RouteCouponDetails");
        },	
        TileV_onpressManageStaff:function () {
            var oRouter = this.getOwnerComponent().getRouter();
            oRouter.navTo("RouteManageStaff");
        },	

    })
})