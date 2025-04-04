sap.ui.define([
	"./BaseController",
	"../utils/validation",
	"sap/m/MessageToast",
	"../model/formatter",
	"sap/ui/core/BusyIndicator",
	"sap/ui/model/json/JSONModel",	
], function (Controller, utils, MessageToast, Formatter, BusyIndicator, JSONModel) {
	"use strict";
	return Controller.extend("sap.kt.com.minihrsolution.controller.ExpenseApplication", {
		Formatter:Formatter,
		onInit: function () {
			this.getRouter().getRoute("RouteExpensePage").attachMatched(this._onRouteMatched, this);
			this._fetchCommonData("BaseLocation", "BaseLocationModel");
			this._fetchCommonData("Country", "CountryModel");
			this._fetchCommonData("ExpenseItemType", "ExpenseTypeModel");
		},

		_onRouteMatched: function (oEvent) {
			this.i18nModel = this.getView().getModel("i18n").getResourceBundle();
			this.Exp_onSearch();
			var View = new JSONModel({ SaveBtn: false, SubmitBtn: false });
			this.getOwnerComponent().setModel(View, "viewModel");
			this.ViewModel = this.getView().getModel("viewModel");
			this.LoginModel = this.getView().getModel("LoginModel");

			var oModel = new JSONModel({
				EmployeeID: this.LoginModel.getProperty("/EmployeeID"),
				EmployeeName: this.LoginModel.getProperty("/EmployeeName"),
				ExpenseName: "",
				ExpStartDate: "",
				ExpEndDate: "",
				TravelAllowance: "",
				Country: "",
				Source: "",
				Destination: "",
				CostCenter: "",
				TripType: "Hotel",
				Comments: "",
				Status: "Draft"
			});
			this.getOwnerComponent().setModel(oModel, "CreateExpenseModel");
			this.getView().getModel("LoginModel").setProperty("/HeaderName", "Expense Details");
			BusyIndicator.hide();
		},
		onPressback: function () {
			this.getRouter().navTo("RouteTilePage");
		},
		onLogout: function () {
			this.getRouter().navTo("RouteLoginPage");
		},

		onPressAddExpense: function (expense) {
			var oView = this.getView();
			if (!this.Expense) {
				this.Expense = sap.ui.core.Fragment.load({
					name: "sap.kt.com.minihrsolution.fragment.AddExpense",
					controller: this
				}).then(function (Expense) {
					this.Expense = Expense;
					oView.addDependent(this.Expense);
					this.Expense.open();
				}.bind(this));
			} else {
				this.Expense.open();
			}
		},

		onPressClose: function () {
			this.Expense.close();
		},

		onPressSubmit: function () {
			try {
				if (utils._LCvalidateMandatoryField(sap.ui.getCore().byId("exp-Id-ExpenseName"), "ID") && utils._LCvalidateDate(sap.ui.getCore().byId("exp-Id-StartDate"), "ID") && utils._LCvalidateDate(sap.ui.getCore().byId("exp-Id-EndDate"), "ID") && utils._LCvalidateMandatoryField(sap.ui.getCore().byId("exp-Id-Country"), "ID") && utils._LCvalidateMandatoryField(sap.ui.getCore().byId("exp-Id-Source"), "ID") && utils._LCvalidateMandatoryField(sap.ui.getCore().byId("exp-Id-Destination"), "ID") && utils._LCvalidateMandatoryField(sap.ui.getCore().byId("exp-Id-EmployeeRemark"), "ID")) {
					BusyIndicator.show();
					var oData = {
						"data": this.getView().getModel("CreateExpenseModel").getData()
					}
					this.ajaxCreateWithJQuery("Expense", oData).then((oData) => {
						if (oData) {
							MessageToast.show(this.i18nModel.getText("offerSuccess"));
							this._fetchCommonData("Expense", "ExpenseModel");
							this.Expense.close();
							BusyIndicator.hide();
						}
					}).catch((oError) => {
						BusyIndicator.hide();
						MessageToast.show(this.i18nModel.getText("commonErrorMessage"));
					})
				} else {
					BusyIndicator.hide();
					MessageToast.show("Please fill all mandatory fields");
				}
			} catch (error) {
			}
		},

		onCheckExpenseDetails: function (oEvent) {
			BusyIndicator.show(0);
			var ExpenseID = oEvent.getSource().getBindingContext("ExpenseModel").getObject().ExpenseID;
			this.getRouter().navTo("RouteExpensDetails", { sPath: ExpenseID.replaceAll("/", "") });
		},

		onLiveExpenseName: function (oEvent) {
			utils._LCvalidateName(oEvent, "oEvent");
		},

		onDatePickerChange: function (oEvent) {
			utils._LCvalidateDate(oEvent, "oEvent");
		},

		onEndDateChange: function (oEvent) {
			utils._LCvalidateDate(oEvent, "oEvent");
		},

		onChangeCountry: function (oEvent) {
			utils._LCvalidateMandatoryField(oEvent, "oEvent");
		},

		onChangeSource: function (oEvent) {
			utils._LCvalidateMandatoryField(oEvent, "oEvent");
		},

		onChangeDestination: function (oEvent) {
			utils._LCvalidateMandatoryField(oEvent, "oEvent");
		},

		onChangeEmployeeRemark: function (oEvent) {
			utils._LCvalidateMandatoryField(oEvent, "oEvent");
		},

		onPressExpenseDownload: function () {
			let fileUrl = window.location.href.split("index")[0] + "/Perdiem_DeclarationForm.doc";
			sap.m.URLHelper.redirect(fileUrl, true)
		},

		onSignout: function () {
			this.getRouter().navTo("RouteLoginPage");
		},

		onPressDeleteExpense: function (oEvent) {
			var ExpID = oEvent.getSource().getBindingContext("ExpenseModel").getObject().ExpenseID;
			this.ajaxDeleteWithJQuery("/Expense", { filters: { ExpenseID: ExpID } }).then(() => {
				MessageToast.show(this.i18nModel.getText("msgCustomerDeleteSuccess"));
				this._fetchCommonData("Expense", "ExpenseModel");
			}).catch((error) => {
				MessageToast.show(error.responseText);
			});
		},

		Exp_onSearch: function () {
			var aFilterItems = this.byId("Exp-id-FilterBar").getFilterGroupItems();
			var params = {};
			aFilterItems.forEach(function (oItem) {
			  var oControl = oItem.getControl(); // Get the associated control
			  var sValue = oItem.getName();
			  if (oControl && oControl.getValue()) {				
				params[sValue] = oControl.getValue();				
			}
			});
			this._fetchCommonData("Expense", "ExpenseModel", params);
		},				
		
		Exp_onPressClear:function(){
			this.byId("Exp_id_EmployeeName").setSelectedKey("");
			this.byId("Exp_id_ConsFilterBar").setSelectedKey("");
			this.byId("Exp_id_SourceFilter").setSelectedKey("");
			this.byId("Exp_id_DestinationFilter").setSelectedKey("");
			this.byId("Exp_id_StatusFilter").setSelectedKey("");
		}


	});
});