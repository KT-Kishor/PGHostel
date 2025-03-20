sap.ui.define([
	"./BaseController",
	 "../utils/validation",
	 "sap/m/MessageToast",
    "../model/formatter",
    "sap/ui/core/BusyIndicator",
	"sap/ui/model/json/JSONModel"
], function(Controller, utils, MessageToast, Formatter, BusyIndicator, JSONModel) {
	"use strict";
	return Controller.extend("sap.kt.com.minihrsolution.controller.ExpenseApplication", {
        onInit: function() {
			this.getRouter().getRoute("RouteExpensePage").attachMatched(this._onRouteMatched, this);
        },

		_onRouteMatched: function(oEvent) {
			var oData = {
				expenses: [
				  {
					ExpenseID:"1",
					employeeName: "John Doe",
					expenseName: "Business Trip",
					startDate: "2025-03-01",
					endDate: "2025-03-05",
					destination: "New York",
					totalAmount: 500,
					reimbursementAmount: 300,
					status: "Approved"
				  },
				  {
					ExpenseID:"2",
					employeeName: "Jane Smith",
					expenseName: "Client Meeting",
					startDate: "2025-03-02",
					endDate: "2025-03-03",
					destination: "Chicago",
					totalAmount: 350,
					reimbursementAmount: 200,
					status: "Pending"
				  }
				]
				
			  };
		
			var View = new JSONModel({SaveBtn:false, SubmitBtn:false});
			this.getOwnerComponent().setModel(View, "viewModel");
			this.ViewModel = this.getOwnerComponent().getModel("viewModel");

			  var oModel = new JSONModel(oData);
			  this.getOwnerComponent().setModel(oModel,"ExpenseModel");
			  this.getView().getModel("LoginModel").setProperty("/HeaderName", "Expense Details");

		},
		onPressback: function () {
			this.getRouter().navTo("RouteTilePage");
		},
		onLogout: function () {
			this.getRouter().navTo("RouteLoginPage");
		},

		onPressAddExpense:function(expense) {
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

		onPressClose:function() {
			this.Expense.close();
		},

		onCheckExpenseDetails:function(oEvent){
			var ExpenseID  = oEvent.getSource().getBindingContext("ExpenseModel").getProperty("ExpenseID");
				this.getRouter().navTo("RouteExpensDetails",{sPath: ExpenseID});
		  },

		onLiveExpenseName:function(oEvent) {
			utils._LCvalidateName(oEvent, "oEvent");
		},

		onDatePickerChange:function(oEvent) {
			utils._LCvalidateDate(oEvent, "oEvent");
		},

		onEndDateChange:function(oEvent) {
			utils._LCvalidateDate(oEvent, "oEvent");
		},
		
		onChangeCountry:function(oEvent) {
			utils._LCvalidateMandatoryField(oEvent, "oEvent");
		},
		
		onChangeSource:function(oEvent) {
			utils._LCvalidateMandatoryField(oEvent, "oEvent");
		},

		onChangeDestination:function(oEvent) {
			utils._LCvalidateMandatoryField(oEvent, "oEvent");	
		},
		
        onChangeEmployeeRemark:function(oEvent) {
            utils._LCvalidateMandatoryField(oEvent, "oEvent");
        },

		onPressSubmit:function() {
			BusyIndicator.show(0);
			if (utils._LCvalidateMandatoryField(sap.ui.getCore().byId("exp-Id-ExpenseName"), "ID") && utils._LCvalidateDate(sap.ui.getCore().byId("exp-Id-StartDate"), "ID") && utils._LCvalidateDate(sap.ui.getCore().byId("exp-Id-EndDate"), "ID") && utils._LCvalidateMandatoryField(sap.ui.getCore().byId("exp-Id-Country"), "ID") && utils._LCvalidateMandatoryField(sap.ui.getCore().byId("exp-Id-Source"), "ID") && utils._LCvalidateMandatoryField(sap.ui.getCore().byId("exp-Id-Destination"), "ID") && utils._LCvalidateMandatoryField(sap.ui.getCore().byId("exp-Id-EmployeeRemark"), "ID")) {
				MessageToast.show("Expense submitted successfully");
				BusyIndicator.hide();
		}else{
			BusyIndicator.hide();
			MessageToast.show("Please fill all mandatory fields");
		}
	},

	onPressExpenseDownload: function () {
        let fileUrl = window.location.href.split("index")[0] + "/Perdiem_DeclarationForm.doc";
        sap.m.URLHelper.redirect(fileUrl, true)
      },

	  onSignout:function(){
		this.getRouter().navTo("RouteLoginPage");
	},

	
	});
});