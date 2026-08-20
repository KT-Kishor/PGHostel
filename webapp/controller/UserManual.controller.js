sap.ui.define([
   "./BaseController",
  "sap/m/MessageBox",
   "sap/m/MessageToast"
], function (BaseController, MessageBox, MessageToast) {
  "use strict"; 
return BaseController.extend("sap.ui.com.project1.controller.UserManual", { 
  onInit: function () {
 this.getOwnerComponent().getRouter().getRoute("RouteUserManual").attachMatched(this._onRouteMatched, this);
  },
  onNavBack:function(){
     this.getOwnerComponent()
        .getRouter()
        .navTo("RouteHostel");
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
