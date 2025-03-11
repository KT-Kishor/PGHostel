sap.ui.define([
	"./BaseController",
	"sap/ui/core/mvc/Controller",
	"sap/ui/model/json/JSONModel"
  ], function (BaseController, Controller, JSONModel) {
	"use strict";
  
	return BaseController.extend("sap.kt.com.minihrsolution.controller.HomePage", {
	  onInit: function () {
		this.getRouter().getRoute("RouteHomePage").attachMatched(this._onRouteMatched, this);
	  },
  
	  _onRouteMatched: function () {
		var oNavContainer = this.byId("pageContainer");
		oNavContainer.to(this.byId("idHome"));
		
		var oData = {
		  "pages": [
			{
			  "pageId": "companyPageId",
			  "header": "Company info",
			  "title": "Kalpavriksha Technologies",
			  "titleUrl": "",
			  "icon": "./image/logo.jpg.png",
			  "displayShape": "circle",
			  "description": "Cell Phone : +91 9686145959",
			  "groups": [
				{
				  "heading": "Contact Details",
				  "elements": [                 
				  ]
				},
				{
				  "heading": "Main Contact",
				  "elements": [
					{
					  "label": "WhatsApp Us On",
					  "value": "+91 9686145959",
					  "elementType": "pageLink",
					  "pageLinkId": "companyEmployeePageId"
					},
					{
					  "label": "Email Us",
					  "value": "accounts@kalpavrikshatechnologies.com",
					  "emailSubject": "Subject",
					  "elementType": "email"
					},
					{
					  "label": "Address",
					  "value": "#111 Karekal layout , Sharanbasaveshwar Nagar, Near Naganhalli Railway Over Bridge, Gulbarga, Karnataka 585102, IN",
					  "elementType": "text"
					},
					{
					  "label": "Find Us On Google Map",
					  "value": "Google Map",
					  "elementType": "link",
					  "url": "https://maps.app.goo.gl/zjt8Xy3FsgV13veMA",
					},                  
					{
					  "label": "Follow Us On Linked in",
					  "value": "Linked in",
					  "elementType": "link",
					  "url": "https://www.linkedin.com/company/kalpavriksha-technologies/",
					}
				  ]
				}
			  ]
			},
		  ]
		};
		var oModel = new JSONModel(oData);
		this.getView().setModel(oModel);
	  },
  
	  onTabSelect: function (oEvent) {
		var oItem = oEvent.getParameter("item");
		this.byId("pageContainer").to(this.byId(oItem.getKey()));
	  },
  
	  onTilePress: function () {
		var iframe = document.createElement('iframe');
		iframe.setAttribute('width', '640');
		iframe.setAttribute('height', '360');
		iframe.setAttribute('src', 'https://www.youtube.com/embed/PdBkOcrmqbo');
		iframe.setAttribute('frameborder', '0');
		iframe.setAttribute('allow', 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture');
		iframe.setAttribute('allowfullscreen', '');
  
		var oContainer = this.byId('pageContainer').getDomRef();
		oContainer.innerHTML = ''; // Clear any existing content
		oContainer.appendChild(iframe);
	  },
	  onpressLogin: function () {
		this.getRouter().navTo("RouteLoginPage")
	  },
	  //linkdin link
	  onClicklinkdin: function () {
		sap.m.URLHelper.redirect("https://www.linkedin.com/company/kalpavriksha-technologies/", true);
	  },
	  //Address link
	  onPressAddress: function () {
		sap.m.URLHelper.redirect("https://www.google.com/maps/dir/17.3390052,76.8399401/kalpavriksha+technologies/@17.3190648,76.8242773,14z/data=!3m1!4b1!4m9!4m8!1m1!4e1!1m5!1m1!1s0x3bc8c122d9181afd:0x6af9e90eb1f5fc8f!2m2!1d76.8487474!2d17.299382?entry=ttu", true);
	  },
	  //navigate to home page
	  onpressHome: function () {
		this.getRouter().navTo("RouteHomePage")
	  },
  
  
  
	});
  });
  