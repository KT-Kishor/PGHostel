sap.ui.define([
   "./BaseController",
  "sap/m/MessageBox",
   "sap/m/MessageToast"
], function (BaseController, MessageBox, MessageToast) {
  "use strict"; 
return BaseController.extend("sap.ui.com.project1.controller.AdminUserManual", { 
  onInit: function () {
 this.getOwnerComponent().getRouter().getRoute("RouteAdminUserManual").attachMatched(this._onRouteMatched, this);
  },

_onRouteMatched: async function  (oEvent) {
    var LoginFUnction = await this.commonLoginFunction();
     if (!LoginFUnction) return;
  const oLoginModel = this.getOwnerComponent().getModel("LoginModel");
              const sRole = oLoginModel.getProperty("/Role");
},

  onNavBack:function(){
  this.getOwnerComponent().getRouter().navTo("TilePage");

  },
  onDownloadGuide: function (oEvent) {
                var oButton = oEvent.getSource();
                var sFileName = oButton.data("pdfFile");

                if (!sFileName) {
                    MessageToast.show("PDF file is not configured");
                    return;
                }

                var sPdfUrl = sap.ui.require.toUrl(
                    "sap/ui/com/project1/Documents/" + sFileName
                );

                var oLink = document.createElement("a");
                oLink.href = sPdfUrl;
                oLink.download = sFileName;

                document.body.appendChild(oLink);
                oLink.click();
                document.body.removeChild(oLink);
            },

});
}); 
