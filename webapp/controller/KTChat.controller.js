sap.ui.define([
	"./BaseController",
	"../utils/validation",
	"sap/ui/model/json/JSONModel",
	"sap/m/MessageToast",
	"sap/m/MessageBox",
	"sap/suite/ui/commons/Timeline",
	"sap/suite/ui/commons/TimelineItem"
], function (
	BaseController,
	utils,
	JSONModel,
	MessageToast,
	MessageBox,
	Timeline,
	TimelineItem
) {
	"use strict";
	return BaseController.extend("sap.kt.com.minihrsolution.controller.KTChat", {

		onInit: function () {
			this.getRouter().getRoute("RouteKTChat").attachMatched(this._onRouteMatched, this);

			var oData = {
				current_room: "",
				current_chat: [],
				subscribed_channels: [],
				username: ""
			};
			var oModelCh = new JSONModel(oData);
			sap.ui.getCore().setModel(oModelCh, "chat");

			var oModel = new JSONModel();
			sap.ui.getCore().setModel(oModel, "table");
		},

		changeName: function (oEvent) {
			var sName = oEvent.getSource().getValue();
			if (!sName.trim()) {
				MessageToast.show("Please enter your name.");
				return;
			}

			var oChatModel = sap.ui.getCore().getModel("chat");
			oChatModel.setProperty("/username", sName);
			MessageToast.show("Name set to: " + sName);
		},

		sendMessage: function (oEvt) {
			var sValue = oEvt.getSource().getValue().trim();
			if (!sValue) return;

			var oChatModel = sap.ui.getCore().getModel("chat");
			var oChatData = oChatModel.getData();
			var sUsername = oChatData.username || "Anonymous";
			var sTimestamp = new Date().toLocaleString();

			// Push new message to model
			oChatData.current_chat.push({
				message: sValue,
				username: sUsername,
				timestamp: sTimestamp
			});
			oChatModel.refresh();
			var oScroll = this.byId("chatScrollContainer");

			// Get or create Timeline only ONCE
			var oTimeline = sap.ui.getCore().byId("dynamicTimeline");
			if (!oTimeline) {
				oTimeline = new sap.suite.ui.commons.Timeline("dynamicTimeline", {
					width: "100%",
					height: "100%",
					enableScroll: false,
					enableDoubleSided:true,
					showSearch: false,
					showHeaderBar: false, 

				});
				oScroll.addContent(oTimeline);
			}

			// Create new message item
			var oItem = new sap.suite.ui.commons.TimelineItem({
				dateTime: sTimestamp,
				text: sValue,
				userName: sUsername,
				icon: "sap-icon://person-placeholder"
			});

			// Add message to timeline
			oTimeline.addContent(oItem);

			// Scroll to bottom after short delay
			setTimeout(function () {
				oScroll.scrollTo(0, oScroll.getScrollHeight(), 300);
			}, 100);

			// Clear input field
			oEvt.getSource().setValue("");
		},


		onPressGoToMaster: function (oEvent) {
			var oSelected = oEvent.getSource().getBindingContext("EmpDetails").getObject();
			var oChatModel = sap.ui.getCore().getModel("chat");
			oChatModel.setProperty("/current_room", oSelected.EmployeeName);
			oChatModel.setProperty("/current_chat", []);
			MessageToast.show("Switched to: " + oSelected.EmployeeName);
		},

		onPressback: function () {
			this.getRouter().navTo("RouteTilePage");
		},

		onLogout: function () {
			this.CommonLogoutFunction();
		}

	});
});
