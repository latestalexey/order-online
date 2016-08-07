/**
 * ### Раздел интерфейса _Настройки_
 * Закладки основных и дополнительных настроек
 *
 * &copy; Evgeniy Malyarov http://www.oknosoft.ru 2014-2016
 */

$p.iface.view_settings = function (cell) {

	function OViewSettings(){

		// дополнительная навигация
		this.tb_nav = $p.iface.btns_nav(cell.cell.querySelector(".dhx_cell_sidebar_hdr"));

		// разделы настроек - таббар с закладками "общее" и "все объекты"
		this.tabs = cell.attachTabbar({
			arrows_mode:    "auto",
			tabs: [
				{id: "settings", text: '<i class="fa fa-key"></i> Общее', active: true}
			]
		});

		// закладка общих настроек - используем стандартную страницу, при необходимости можем переопределить
		this.settings = new $p.iface.Setting2col(this.tabs.cells("settings"));

	}

	return $p.iface._settings || ($p.iface._settings = new OViewSettings());

};
