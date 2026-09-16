sap.ui.define([
	 "./BaseController",
	"sap/ui/model/json/JSONModel",
	"sap/ui/model/Filter",
	"sap/ui/model/FilterOperator",
	"sap/m/Dialog",
	"sap/m/Button",
	"sap/m/MessageToast",
    "sap/ui/core/Fragment"
], function (BaseController, JSONModel, Filter, FilterOperator, Dialog, Button,  MessageToast, Fragment) {
	"use strict";

	return BaseController.extend("sap.ui.com.project1.controller.NewManual", {

		onInit: function () {
             this.getOwnerComponent().getRouter().getRoute("RouteNewManual").attachMatched(this._onRouteMatched, this);
			   var oModel = new JSONModel();

            oModel.loadData(
                sap.ui.require.toUrl("sap/ui/com/project1/model/UserManual.json")
            );
			this.getView().setModel(oModel, "manual");
        

             this.getView().setModel(new JSONModel({
                title: ""
            }), "dialog");
		},
_onRouteMatched: async function  (oEvent) {
    var LoginFUnction = await this.commonLoginFunction();
     if (!LoginFUnction) return;
  const oLoginModel = this.getOwnerComponent().getModel("LoginModel");
              const sRole = oLoginModel.getProperty("/Role");
          
			this._applyFilters();
},
	 onBack:function(){
  this.getOwnerComponent().getRouter().navTo("TilePage");

  },
  isCardVisible: function (aExcludeRoles, sRole) {
			if (!aExcludeRoles || !aExcludeRoles.length) {
				return true;
			}
			return aExcludeRoles.indexOf(sRole) === -1;
		},

      _applyFilters: function (sSearchQuery) {
			var oGrid = this.byId("cardGrid");
			var oBinding = oGrid.getBinding("items");
			if (!oBinding) {
				return;
			}
 
			if (sSearchQuery) {
				oBinding.filter(new Filter({
					filters: [
						new Filter("title", FilterOperator.Contains, sSearchQuery),
						new Filter("description", FilterOperator.Contains, sSearchQuery)
					],
					and: false
				}));
			} else {
				oBinding.filter([]);
			}
 
			var bEmpty = oBinding.getLength() === 0;
			this.byId("emptyState").setVisible(bEmpty);
			oGrid.setVisible(!bEmpty);
		},

			onSearch: function (oEvent) {
			var sQuery = oEvent.getParameter("newValue");
			this._applyFilters(sQuery);
		},

onViewDemo: function (oEvent) {

    var oContext = oEvent.getSource().getBindingContext("manual");

    if (!oContext) {
        sap.m.MessageToast.show("Video information not found.");
        return;
    }

    var sVideoUrl = oContext.getProperty("videoUrl");
    var sTitle = oContext.getProperty("title");

    console.log("Selected video:", sVideoUrl);

    this.getView()
        .getModel("dialog")
        .setProperty("/title", sTitle);

    if (!this._oVideoDialog) {

        Fragment.load({
            id: this.getView().getId(),
            name: "sap.ui.com.project1.fragment.NewManual",
            controller: this

        }).then(function (oDialog) {

            this._oVideoDialog = oDialog;

            this.getView().addDependent(oDialog);

            oDialog.open();

            // Wait for rendering
            setTimeout(function () {
                this._loadVideo(sVideoUrl);
            }.bind(this), 500);

        }.bind(this));

    } else {

        this._oVideoDialog.open();

        setTimeout(function () {
            this._loadVideo(sVideoUrl);
        }.bind(this), 500);
    }
},
_loadVideo: function (sVideoUrl) {

    var oHTML = Fragment.byId(
        this.getView().getId(),
        "videoFrameHtml_Manual"
    );

    if (!oHTML) {
        console.error("HTML control not found");
        return;
    }

    var oDomRef = oHTML.getDomRef();

    if (!oDomRef) {
        console.error("HTML DOM not found");
        return;
    }

    var oVideo = oDomRef.querySelector("video");
    var oSource = oDomRef.querySelector("source");

    if (!oVideo || !oSource) {
        console.error("Video/source element not found");
        return;
    }

    // Build URL
    var sFullVideoUrl = sap.ui.require.toUrl(
        "sap/ui/com/project1/" + sVideoUrl
    );

    console.log("Final video URL:", sFullVideoUrl);

    // Set source
    oSource.src = sFullVideoUrl;

    // Reload video
    oVideo.load();

    // Play
    oVideo.play()
        .then(function () {

            console.log("Video started successfully");

        })
        .catch(function (oError) {

            console.warn(
                "Video autoplay blocked:",
                oError
            );

        });
},
onCloseVideoDialog: function () {

    if (this._oVideoDialog) {
        this._oVideoDialog.close();
    }
},
onVideoDialogClose: function () {

    var oPlayer = document.getElementById(
        this.getView().getId() + "--umPlayer"
    );

    if (oPlayer) {

        oPlayer.pause();

        oPlayer.removeAttribute("src");

        oPlayer.load();
    }
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
    



showDescriptionLinkVisible: function (sDescription) {

    return !!sDescription && sDescription.length > 300;
},
onShowDescription: function (oEvent) {

    var oLink = oEvent.getSource();
    var oContext = oLink.getBindingContext("manual");

    var sDescription = oContext.getProperty("description");

    // Show complete description
    MessageBox.information(sDescription, {
        title: "Description"
    });
},
onToggleDescription: function (oEvent) {

    var oLink = oEvent.getSource();
    var oContext = oLink.getBindingContext("manual");

    var oModel = this.getView().getModel("manual");
    var sPath = oContext.getPath();

    var bExpanded = oModel.getProperty(sPath + "/expanded");

    oModel.setProperty(
        sPath + "/expanded",
        !bExpanded
    );
},

	});
});