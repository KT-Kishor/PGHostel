sap.ui.define([
	"sap/ui/core/mvc/Controller"
], function(
	Controller
) {
	"use strict";

	return Controller.extend("sap.kt.com.minihrsolution.controller.HRSolutions_Demo", {
		onInit: function() {
			//   this.getRouter().getRoute("HRSolutions_Demo").attachMatched(this._onRouteMatched, this);
		},
		onOpenDemoForm: function() {
			  if (!this._oDemoFormDialog) {
            this._oDemoFormDialog = sap.ui.xmlfragment(
              this.getView().getId(), "sap.kt.com.minihrsolution.fragment.NewDemoform",
              this
            );
            this.getView().addDependent(this._oDemoFormDialog);
          }
          this._oDemoFormDialog.open();
		}
,
 onCloseDemoForm: function () {
          if (this._oDemoFormDialog) {
            this._oDemoFormDialog.close();
          }
        },

	});
});