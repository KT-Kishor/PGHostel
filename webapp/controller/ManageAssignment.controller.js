sap.ui.define(
  [
    "./BaseController",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast",
    "../utils/validation",
    "sap/ui/core/BusyIndicator",
  ],
  function (BaseController, JSONModel, MessageToast, utils, BusyIndicator) {
    "use strict";
    return BaseController.extend(
      "sap.kt.com.minihrsolution.controller.ManageAssignment",
      {
        onInit: function () {
          this.getRouter().getRoute("RouteManageAssignment").attachMatched(this._onRouteMatched, this);
        },
        _onRouteMatched: function () {
          this._fetchCommonData("NewTask", "TaskModel", {});
          this.CommonReadcall()
          this.i18nModel = this.getView().getModel("i18n").getResourceBundle();
          this.getView().getModel("LoginModel").setProperty("/HeaderName", "Create New Assignment");
        },
        onPressback: function () {
          this.getRouter().navTo("RouteTilePage");
        },
        onLogout: function () {
          this.getRouter().navTo("RouteLoginPage");
        },
        MA_onCreateTask: function () {
          this.manageTaskDetails(false); // false means create
        },

        MA_onEditTask: function () {
          this.manageTaskDetails(true); // true means edit
        },

        manageTaskDetails: function (bIsEdit) {
          const oView = this.getView();
          const oVisibleModel = new JSONModel({ save: false, submit: true });
          oView.setModel(oVisibleModel, "visiblePlay");

          let oModel;

          if (bIsEdit) {
            oVisibleModel.setProperty("/save", true);
            oVisibleModel.setProperty("/submit", false);

            const oTable = this.byId("MA_id_TaskTable");
            const oSelectedItem = oTable.getSelectedItem();

            if (!oSelectedItem) {
              return MessageToast.show("Please select a task to edit");
            }

            const oData = oSelectedItem.getBindingContext("TaskModel").getObject();
            this._originalTaskData = JSON.parse(JSON.stringify(oData)); // deep copy
            oModel = new JSONModel(oData);
          } else {
            this._originalTaskData = null;
            const newTaskData = {
              TaskName: "",
              TaskType: "",
              TaskTypeDescription: "",
              StartDate: "",
              EndDate: "",
            };
            oModel = new JSONModel(newTaskData);
          }

          oView.setModel(oModel, "EditTaskModel");

          if (!this.oTaskDialog) {
            sap.ui.core.Fragment.load({
              name: "sap.kt.com.minihrsolution.fragment.NewAssignment", // your fragment path
              controller: this,
            }).then(
              function (oDialog) {
                this.oTaskDialog = oDialog;
                oView.addDependent(oDialog);
                oDialog.open();
              }.bind(this)
            );
          } else {
            this.oTaskDialog.open();
          }
        },
        MA_onPressClear: function () {
          var oFilterBar = this.getView().byId("MA_id_FilterBar");
          oFilterBar.getFilterGroupItems().forEach(function (oItem) {
            var oControl = oItem.getControl();
            if (oControl.setSelectedKey) {
              oControl.setSelectedKey("");
            } else if (oControl.setValue) {
              oControl.setValue("");
            }
          });
        },
        NAF_onTaskClose: function () {
          const oTable = this.byId("MA_id_TaskTable");
          oTable.removeSelections(true); // Clear selection

          if (this.oTaskDialog) {
            this.oTaskDialog.close();
          }
        },
        AT_ValidateCommonFields: function (oEvent) {
          utils._LCvalidateMandatoryField(oEvent);
        },
        AT_validateDate: function (oEvent) {
          utils._LCvalidateDate(oEvent);
        },

        NAF_onSubmitTask: async function () {
          const oData = this.getView().getModel("EditTaskModel").getData();
          // Simple validation
          if (
            utils._LCvalidateMandatoryField(sap.ui.getCore().byId("FNA_id_TaskName"), "ID") &&
            utils._LCvalidateMandatoryField(sap.ui.getCore().byId("NAF_id_Description"), "ID") &&
            utils._LCvalidateDate(sap.ui.getCore().byId("NAF_id_StartDate"), "ID") &&
            utils._LCvalidateDate(sap.ui.getCore().byId("NAF_id_EndDate"), "ID")
          ) {
          } else {
            MessageToast.show(this.i18nModel.getText("mandetoryFields"));
            return;
          }
          var TaskType = sap.ui.getCore().byId("FNA_id_Tasktype").getSelectedKey();
          oData.TaskType = TaskType;
          BusyIndicator.show(0);
          const response = await this.ajaxCreateWithJQuery("NewTask", {
            data: oData,
          });
          if (response.success === true) {
            BusyIndicator.hide();
            MessageToast.show("Task created successfully!");
            this.oTaskDialog.close();
            this._fetchCommonData("NewTask", "TaskModel", {});
          } else {
            BusyIndicator.hide();
            MessageToast.show("Failed to create task.");
          }
        },
        MA_onPressSave: async function () {
          const oSelectedItem = this.byId("MA_id_TaskTable").getSelectedItem();

          if (!oSelectedItem) {
            MessageToast.show("Please select a task to update.");
            return;
          }
          const oData = this.getView().getModel("EditTaskModel").getData();
          const oTaskId = oSelectedItem.getBindingContext("TaskModel").getProperty("TaskID");

          const requestData = { filters: { TaskID: oTaskId }, data: oData };
          BusyIndicator.show(0);
          const response = await this.ajaxUpdateWithJQuery("/NewTask",
            requestData
          );

          if (response.success === true) {
            BusyIndicator.hide();
            MessageToast.show("Task updated successfully!");
            this.oTaskDialog.close();
            this._fetchCommonData("NewTask", "TaskModel", {});
            this.CommonReadcall()
          } else {
            BusyIndicator.hide();
            MessageToast.show("Failed to update task.");
          }
        },
        MA_onSearch: function () {
          var aFilterItems = this.byId("MA_id_FilterBar").getFilterGroupItems();
          var params = {};
          aFilterItems.forEach(function (oItem) {
            var oControl = oItem.getControl();
            var sValue = oItem.getName();
            if (oControl && oControl.getValue()) {
              params[sValue] = oControl.getValue();
            }
          });
          this._fetchCommonData("NewTask", "TaskModel", params);
          this.CommonReadcall(params);
        },
        CommonReadcall: async function (params) {
          try {
            BusyIndicator.show(0);
            const response = await this.ajaxReadWithJQuery("NewTask", params);
            if (response.success === true) {
              BusyIndicator.hide();
              // Ensure data is an array
              const taskData = Array.isArray(response.data)
                ? response.data
                : [response.data];
              const oModel = new JSONModel(taskData);
              this.getView().setModel(oModel, "TaskModel");
            }
          } catch (error) {
            BusyIndicator.hide();
            MessageToast.show("Request failed");
          }
        },

        MA_onItemPress: function (oEvent) {
          const oSelectedItem = oEvent.getSource().getBindingContext("TaskModel").getObject();
          this.getRouter().navTo("RouteAssignTask", {
            taskID: oSelectedItem.TaskID, // Pass actual TaskID
          });
        },
      }
    );
  }
);
