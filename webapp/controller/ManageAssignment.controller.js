sap.ui.define(
  [
    "./BaseController",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast",
    "../utils/validation",
  ],
  function (BaseController, JSONModel, MessageToast, utils) {
    "use strict";
    return BaseController.extend(
      "sap.kt.com.minihrsolution.controller.ManageAssignment",
      {
        onInit: function () {
          this.getRouter()
            .getRoute("RouteManageAssignment")
            .attachMatched(this._onRouteMatched, this);
        },
        _onRouteMatched: function () {
          this._fetchCommonData("NewTask", "TaskModel", {});
          this.i18nModel = this.getView().getModel("i18n").getResourceBundle();
          this.getView()
            .getModel("LoginModel")
            .setProperty("/HeaderName", "Create New Assignment");
          // if (!this.getView().getModel("TaskModel")) {
          //   this.getView().setModel(new JSONModel([]), "TaskModel");
          // }
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

            const oData = oSelectedItem
              .getBindingContext("TaskModel")
              .getObject();
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
          if (this.oTaskDialog) {
            this.oTaskDialog.close();
          }
        },
        AT_ValidateCommonFields: function (oEvent) {
          utils._LCvalidateMandatoryField(oEvent);
        },

        NAF_onSubmitTask: async function () {
          const oData = this.getView().getModel("EditTaskModel").getData();
          // Simple validation
          if (
            utils._LCvalidateMandatoryField(
              sap.ui.getCore().byId("FNA_id_TaskName"),
              "ID"
            ) &&
            utils._LCvalidateMandatoryField(
              sap.ui.getCore().byId("NAF_id_Description"),
              "ID"
            )
          ) {
          } else {
            MessageToast.show(this.i18nModel.getText("mandetoryFields"));
            return;
          }
          var TaskType = sap.ui
            .getCore()
            .byId("FNA_id_Tasktype")
            .getSelectedKey();
          oData.TaskType = TaskType;

          const response = await this.ajaxCreateWithJQuery("NewTask", {
            data: oData,
          });
          if (response.success === true) {
            MessageToast.show("Task created successfully!");
            this.oTaskDialog.close();
            this._fetchCommonData("NewTask", "TaskModel", {});
          } else {
            MessageToast.show("Failed to create task.");
          }
        },
        MA_onPressSave: async function () {
          const oTable = this.byId("MA_id_TaskTable");
          const oSelectedItem = oTable.getSelectedItem();

          if (!oSelectedItem) {
            MessageToast.show("Please select a task to update.");
            return;
          }

          const oData = this.getView().getModel("EditTaskModel").getData();
          const sTaskId = oSelectedItem
            .getBindingContext("TaskModel")
            .getProperty("TaskID");

          const requestData = { filters: { TaskID: sTaskId }, data: oData };

          const response = await this.ajaxUpdateWithJQuery(
            "/NewTask",
            requestData
          );

          if (response.success === true) {
            MessageToast.show("Task updated successfully!");
            this.oTaskDialog.close();
            this._fetchCommonData("NewTask", "TaskModel", {});
          } else {
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
            const response = await this.ajaxReadWithJQuery("NewTask", params);
            if (response.success === true) {
              // Ensure data is an array
              const taskData = Array.isArray(response.data)
                ? response.data
                : [response.data];
              const oModel = new JSONModel(taskData);
              this.getView().setModel(oModel, "TaskModel");
            }
          } catch (error) {
            MessageToast.show("Request failed");
          }
        },

        MA_onItemPress: function (oEvent) {
          const oSelectedTask = oEvent
            .getSource()
            .getBindingContext("TaskModel")
            .getObject();
          const oRouter = this.getRouter();

          // Encode the task data as a URI component to pass as a route parameter
          const taskDataStr = encodeURIComponent(JSON.stringify(oSelectedTask));
          oRouter.navTo("RouteAssignTask", {
            taskData: taskDataStr,
          });
        },
      }
    );
  }
);
